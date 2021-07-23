import * as path from 'path'
import * as fs from 'fs'
import * as core from '@actions/core'
import {glob} from 'glob'
import {getYaml} from './file-reader'

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

    return await Promise.all(
      filePaths.map(async filePath => {
        try {
          core.debug(filePath)
          const yamlDocument = await getYaml(path.join(workspaceRoot, filePath))
          let result = false
          const link = yamlDocument ? yamlDocument['link'] : null
          if (link) {
            let linkPath = path.join(workspaceRoot, link)
            linkPath = linkPath.replace(/#\w+\s*$/, '')
            // TODO: Support also checking hashtags!
            for (const lp of [linkPath, `${linkPath}.md`]) {
              if (fs.existsSync(lp)) {
                result = true
              }
            }
          } else {
            result = true
          }

          if (!result) {
            core.warning(`${filePath} had dead link to ${link}`)
          }

          return {filePath, valid: result}
        } catch (e) {
          core.error(filePath)
          core.error(e)
          return {filePath, valid: false}
        }
      })
    )
  } catch (err) {
    core.error(workspaceRoot)
    core.error(err)
    return [{filePath: workspaceRoot, valid: false}]
  }
}
