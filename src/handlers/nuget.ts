import axios from 'axios'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { PackageVersion, NugetDependencies, PackageHandler } from '../types/index.js'

export class NugetHandler implements PackageHandler {
  private registry = 'https://api.nuget.org/v3'

  private async getPackageVersion(
    packageName: string,
    currentVersion?: string
  ): Promise<PackageVersion> {
    try {
      const response = await axios.get(
        `${this.registry}/registration5-gz-semver2/${encodeURIComponent(packageName.toLowerCase())}/index.json`
      )

      const versions = response.data.items?.[0]?.items
      if (!versions || versions.length === 0) {
        throw new Error('No versions found')
      }

      const latestVersion = versions[versions.length - 1].catalogEntry.version
      if (!latestVersion) {
        throw new Error('Latest version not found')
      }

      const result: PackageVersion = {
        name: packageName,
        latestVersion,
        registry: 'nuget',
      }

      if (currentVersion) {
        result.currentVersion = currentVersion
      }

      return result
    } catch (error) {
      console.error(`Error fetching NuGet package ${packageName}:`, error)
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch NuGet package ${packageName}`
      )
    }
  }

  async getLatestVersion(args: { dependencies: NugetDependencies }) {
    if (!args.dependencies || typeof args.dependencies !== 'object') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid dependencies object'
      )
    }

    const results: PackageVersion[] = []
    for (const [name, version] of Object.entries(args.dependencies)) {
      if (typeof version !== 'string') continue
      try {
        const result = await this.getPackageVersion(name, version)
        results.push(result)
      } catch (error) {
        console.error(`Error checking NuGet package ${name}:`, error)
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    }
  }
} 