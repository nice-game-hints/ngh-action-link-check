import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'
import * as core from '@actions/core'
import {glob} from 'glob'
import {getYaml} from './file-reader'
import markdownLinkExtractor from 'markdown-link-extractor'

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

async function getFiles(dir: string) : Promise<string[]> {
  const subdirs = await readdir(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = path.resolve(dir, subdir);
    return (await stat(res)).isDirectory() ? getFiles(res) : [res];
  }));
  return files.reduce((a, f) => a.concat(f), []);
}

export interface ValidationResult {
  filePath: string
  valid: boolean
}

export const validateLinks = async (
  workspaceRoot: string,
  mdGlob: string
): Promise<ValidationResult[]> => {
  try {
    //TODO: improve this implementation - e.g. use the glob patterns from the yaml.schemas settings
    core.info('following filepaths found')
    const filePaths = await new Promise<string[]>((c, e) => {
      glob(
        mdGlob,
        {
          cwd: workspaceRoot,
          silent: true,
          nodir: true
        },
        // tslint:disable-next-line
        (err: any, files: string[] | PromiseLike<string[]>) => {
          if (err) {
            e(err)
          }
          c(files)
        }
      )
    })
    core.info(filePaths.join(' - '))

    return await Promise.all(
      filePaths.map(async filePath => {
        let result = true
        try {
          // Check the yaml metadata link
          /*
          if (link) {
            result = false
            let linkPath = path.join(workspaceRoot, link)
            linkPath = linkPath.replace(/#\w+\s*$/, '')
            // TODO: Support also checking hashtags!
            for (const lp of [linkPath, `${linkPath}.md`]) {
              if (fs.existsSync(lp)) {
                result = true
              }
            }

            core.info(filePath)
            if (!result) {
              core.warning(`${filePath} had dead link to ${link}`)
            }
          }
          */

          // Extract all md links and add yaml link
          const markdown = fs.readFileSync(path.join(workspaceRoot, filePath), {encoding: 'utf8'})
          let { links } = markdownLinkExtractor(markdown)
          const yamlDocument = await getYaml(path.join(workspaceRoot, filePath))
          const link = yamlDocument ? yamlDocument['link'] : null
          if (link) {
            links = [link].concat(links) // prepend
          }

          links = links.map((l: string) => l.replace(/#\w+\s*$/, ''))
          links = links.filter((l: string) => !l.match(/\.[a-zA-Z0-9]{0,4}$/))

          links = links.filter((l: string) => !l.startsWith('http'))
          links = links.filter((l: string) => !(l.startsWith('(') && l.endsWith(')')))
          if (links.length > 0) {
            core.debug(` ${filePath} found links`)
            core.debug('  ' + links.join(' - '))
            let files = await getFiles(workspaceRoot)
            files = files.map(file => file.replace(workspaceRoot, ''))
            links.map((l: string) => {
              let linkFound = false
              if (files.find(f => f.endsWith(`${path.sep}${l}.md`))) linkFound = true // just a file
              if (files.find(f => f.endsWith(`${path.sep}${l}${path.sep}index.md`))) linkFound = true // a folder

              if (!linkFound) {
                core.warning(`${filePath} had dead link to ${l}`)
                result = false
              }
            })
          } else {
            core.debug(`no links for ${filePath} found`)
          }
        } catch (e) {
          core.error(filePath)
          core.error(e as Error)
          return {filePath, valid: false}
        }

        core.debug(`${filePath} handled`)
        return {filePath, valid: result}
      })
    )
  } catch (err) {
    core.error(workspaceRoot)
    core.error(err as Error)
    return [{filePath: workspaceRoot, valid: false}]
  }
}
