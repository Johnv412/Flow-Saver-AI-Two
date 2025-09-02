const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const pty = require('node-pty');
const os = require('os');
const path = require('path');

class ClaudeTerminal extends EventEmitter {
  constructor(projectPath) {
    super();
    this.projectPath = projectPath || process.cwd();
    this.ptyProcess = null;
    this.isRunning = false;
  }

  startSession() {
    if (this.isRunning) {
      return;
    }

    // Determine shell based on OS
    const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
    
    try {
      // Create a PTY process for the terminal
      this.ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: this.projectPath,
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        }
      });

      this.isRunning = true;

      // Handle terminal output
      this.ptyProcess.onData((data) => {
        this.emit('output', data);
      });

      // Handle terminal exit
      this.ptyProcess.onExit(() => {
        this.isRunning = false;
        this.emit('exit');
      });

      this.emit('ready');
      
    } catch (error) {
      console.error('Failed to start terminal session:', error);
      this.emit('error', error);
    }
  }

  write(data) {
    if (this.ptyProcess && this.isRunning) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols, rows) {
    if (this.ptyProcess && this.isRunning) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  // Method to start Claude Code directly
  startClaude(currentTask = null, contextData = null) {
    if (!this.isRunning) {
      this.startSession();
      // Wait for session to be ready, then start Claude
      this.once('ready', () => {
        this.launchClaudeCode(currentTask, contextData);
      });
    } else {
      this.launchClaudeCode(currentTask, contextData);
    }
  }

  launchClaudeCode(currentTask, contextData) {
    // Build context-aware Claude command
    let claudeCommand = 'claude';
    
    if (currentTask) {
      claudeCommand += ` --context "Current Task: ${currentTask.title}"`;
      if (currentTask.priority) {
        claudeCommand += ` --context "Priority: ${currentTask.priority}"`;
      }
    }
    
    if (contextData) {
      claudeCommand += ` --context "${contextData}"`;
    }

    // Send the command to start Claude
    this.write(`echo "🚀 Starting Claude Code in FlowSaver context..."\n`);
    this.write(`${claudeCommand}\n`);
  }

  kill() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.isRunning = false;
    }
  }
}

module.exports = ClaudeTerminal;