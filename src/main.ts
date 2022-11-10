import * as core from '@actions/core'
// import * as github from '@actions/github'
import {validateLinks} from './ngh-link-validator'

async function run(): Promise<void> {
  try {
    const workspaceRoot = process.env['GITHUB_WORKSPACE'] || process.cwd()
    const mdGlob = core.getInput('mdGlob') || '**/*.md'

    core.info('check ngh links')
    core.info(workspaceRoot)
    core.info(mdGlob)
    const validationResults = await validateLinks(workspaceRoot, mdGlob)
    core.info('validation ready, debug validationResults')
    core.debug(validationResults.join(' '))
    core.info('validationResults end')
    const invalidResults = validationResults
      .filter(res => !res.valid)
      .map(res => res.filePath)
    const invalidFiles =
      invalidResults.length > 0 ? invalidResults.join(',') : ''
    core.setOutput('invalidFiles', invalidFiles)

    if (invalidResults.length > 0) {
      core.warning(`Invalid Files: ${invalidFiles}`)
      core.setFailed(
        'NGH metadata linking validation failed on one or more YAML files.'
      )
    } else {
      core.info(`✅ NGH metadata linking validation completed successfully`)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
