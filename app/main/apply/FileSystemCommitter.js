const fs = require('fs').promises;
const path = require('path');

/**
 * FileSystem Committer
 * Applies preview actions to actual filesystem
 * Includes rollback capability for safety
 */
class FileSystemCommitter {
  constructor() {
    this.executedActions = [];
  }

  /**
   * Apply all pending actions to filesystem
   * @param {OrganizationAction[]} actions
   * @returns {Promise<{success: boolean, applied: number, failed: number, errors: any[]}>}
   */
  async applyActions(actions) {
    const results = {
      success: true,
      applied: 0,
      failed: 0,
      errors: []
    };

    this.executedActions = [];

    for (const action of actions) {
      if (action.applied) {
        continue; // Skip already applied actions
      }

      try {
        await this._executeAction(action);
        action.applied = true;
        this.executedActions.push(action);
        results.applied++;
      } catch (error) {
        console.error(`Failed to apply action ${action.id}:`, error);
        results.failed++;
        results.errors.push({
          actionId: action.id,
          error: error.message
        });
        results.success = false;

        // Stop on first error to prevent partial application
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single action
   * @private
   */
  async _executeAction(action) {
    console.log(`Executing: ${action.type} for ${action.fileId}`);

    switch (action.type) {
      case 'move':
        await this._executeMove(action);
        break;

      case 'rename':
        await this._executeRename(action);
        break;

      case 'delete':
        await this._executeDelete(action);
        break;

      case 'create_folder':
        await this._executeCreateFolder(action);
        break;

      case 'merge':
        await this._executeMerge(action);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute move operation
   * @private
   */
  async _executeMove(action) {
    const { originalPath, newPath } = action.params;

    // Ensure destination directory exists
    await fs.mkdir(path.dirname(newPath), { recursive: true });

    // Move file
    await fs.rename(originalPath, newPath);

    console.log(`Moved: ${originalPath} -> ${newPath}`);
  }

  /**
   * Execute rename operation
   * @private
   */
  async _executeRename(action) {
    const { originalPath, newName } = action.params;
    const newPath = path.join(path.dirname(originalPath), newName);

    await fs.rename(originalPath, newPath);

    console.log(`Renamed: ${originalPath} -> ${newPath}`);
  }

  /**
   * Execute delete operation
   * @private
   */
  async _executeDelete(action) {
    const { path: filePath, isDirectory } = action.params;

    if (isDirectory) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }

    console.log(`Deleted: ${filePath}`);
  }

  /**
   * Execute create folder operation
   * @private
   */
  async _executeCreateFolder(action) {
    const { path: folderPath } = action.params;

    await fs.mkdir(folderPath, { recursive: true });

    console.log(`Created folder: ${folderPath}`);
  }

  /**
   * Execute merge operation
   * @private
   */
  async _executeMerge(action) {
    const { sourceFiles, destinationFolder } = action.params;

    // Ensure destination exists
    await fs.mkdir(destinationFolder, { recursive: true });

    // Move all source files to destination
    for (const sourceFile of sourceFiles) {
      const fileName = path.basename(sourceFile);
      const newPath = path.join(destinationFolder, fileName);
      await fs.rename(sourceFile, newPath);
    }

    console.log(`Merged ${sourceFiles.length} files into ${destinationFolder}`);
  }

  /**
   * Rollback last applied actions
   * @param {number} count - Number of actions to rollback (default: all)
   * @returns {Promise<{success: boolean, rolledBack: number}>}
   */
  async rollback(count = -1) {
    const actionsToRollback = count < 0
      ? this.executedActions.slice().reverse()
      : this.executedActions.slice(-count).reverse();

    let rolledBack = 0;

    for (const action of actionsToRollback) {
      try {
        await this._rollbackAction(action);
        action.applied = false;
        rolledBack++;
      } catch (error) {
        console.error(`Failed to rollback action ${action.id}:`, error);
        break;
      }
    }

    return {
      success: rolledBack === actionsToRollback.length,
      rolledBack
    };
  }

  /**
   * Rollback a single action
   * @private
   */
  async _rollbackAction(action) {
    console.log(`Rolling back: ${action.type} for ${action.fileId}`);

    switch (action.type) {
      case 'move':
      case 'rename':
        // Reverse by moving back
        await fs.rename(action.params.newPath, action.params.originalPath);
        break;

      case 'delete':
        // Cannot rollback delete (file is gone)
        console.warn(`Cannot rollback delete of ${action.params.path}`);
        break;

      case 'create_folder':
        // Remove created folder
        await fs.rmdir(action.params.path);
        break;

      case 'merge':
        // Reverse merge by moving files back
        for (const sourceFile of action.params.sourceFiles) {
          const fileName = path.basename(sourceFile);
          const currentPath = path.join(action.params.destinationFolder, fileName);
          await fs.rename(currentPath, sourceFile);
        }
        break;
    }
  }

  /**
   * Clear executed actions history
   */
  clearHistory() {
    this.executedActions = [];
  }
}

module.exports = FileSystemCommitter;
