# Phoenix Code Node.js Extension Template Analysis vs brackets-terminal

## 1. Node/ Directory Structure Comparison

### Official Phoenix Code Template
```
node/
├── package.json          # Simple dependency management
├── index.js             # Main entry point (exports functions)
└── (no domain file needed)
```

### brackets-terminal Current
```
node/
├── package.json
├── TerminalDomain.js    # Old-style domain registration
└── (no separate index.js)
```

**Key Difference**: Official template uses simple function exports in `index.js`. The brackets-terminal uses the older Brackets domain pattern with explicit registration.

---

## 2. NodeDomain Initialization & Configuration

### Official Phoenix Code Template (Modern - NodeConnector)

**package.json configuration:**
```json
{
  "nodeConfig": {
    "nodeIsRequired": false,
    "main": "node/index.js",
    "npmInstall": "node/"
  }
}
```

**Phoenix side (main.js):**
```javascript
const NodeConnector = brackets.getModule("NodeConnector");

// Initialize in AppInit.appReady
nodeConnector = NodeConnector.createNodeConnector(
    "your-extension-id-1",
    exports
);

// Call node functions
await nodeConnector.execPeer("echoTest", "yo!");
```

**Node side (node/index.js):**
```javascript
const extnNodeConnector = global.createNodeConnector(
    "your-extension-id-1",
    exports
);

async function echoTest(name) {
    return "hello from node " + name;
}

exports.echoTest = echoTest;
```

### brackets-terminal Current (Legacy - NodeDomain)

**package.json configuration:**
```json
{
  "nodeConfig": {
    "main": "node/TerminalDomain.js",
    "npmInstall": true
  }
}
```
**Missing `nodeIsRequired` field** - doesn't indicate if extension requires Node.

**Phoenix side (main.js):**
Uses traditional modules and jQuery $.Deferred patterns:
- No direct NodeConnector usage
- Communication through `NodeDomain` via `localNodeTransport`

**Node side (node/TerminalDomain.js):**
```javascript
function init(DomainManager) {
    domainManager = DomainManager;
    domainManager.registerDomain('bracketsTerminal', {...});
    domainManager.registerCommand('bracketsTerminal', 'createTerminal', ...);
}
exports.init = init;
```

---

## 3. registerCommand & registerEvent API Signatures

### Official Phoenix Code Template (NodeConnector)

**No explicit registration needed!** Functions are auto-exported:

```javascript
// In node/index.js
async function convertToGreyScale(imageName, imageArrayBuffer) {
    const outputBuffer = await sharp(imageArrayBuffer).grayscale().toBuffer();
    return {
        success: true,
        buffer: outputBuffer  // Return object with 'buffer' key for binary data
    };
}

exports.convertToGreyScale = convertToGreyScale;

// Automatically available via: 
// await nodeConnector.execPeer("convertToGreyScale", {...}, imageArrayBuffer)
```

**Events - using EventDispatcher pattern:**
```javascript
// Trigger event from Node to Phoenix:
nodeConnector.triggerPeer('eventName', payloadValue);

// Listen in Phoenix:
nodeConnector.on('eventName', (event, payload) => { ... });
nodeConnector.one('eventName', (event, payload) => { ... });  // Once only
nodeConnector.off('eventName');  // Unsubscribe
```

### brackets-terminal Current (NodeDomain)

**Explicit registration required:**

```javascript
// Register commands:
domainManager.registerCommand('bracketsTerminal', 'createTerminal', createTerminal, false);
domainManager.registerCommand('bracketsTerminal', 'writeTerminal', writeTerminal, false);

// Register events:
domainManager.registerEvent('bracketsTerminal', 'terminalData', [
    { name: 'payload', type: 'object' }
]);

// Emit events:
domainManager.emitEvent('bracketsTerminal', 'terminalData', [payload]);

// Listen on Phoenix side:
domain.on('terminalData', function (event, payload) {
    trigger('data', payload);
});
```

---

## 4. Domain Event Emission Differences

### Official Phoenix Code Template

**Two-way seamless event flow:**
```javascript
// From Node:
nodeConnector.triggerPeer('phoenixProjectOpened', '/x/project/folder');

// From Phoenix:
nodeConnector.triggerPeer('imageEdited', 'name.png', imageArrayBuffer);

// Listen on either side:
nodeConnector.on('eventName', (_event, ...args) => {});
```

**Benefits:**
- Unified event API (no distinction between sides)
- Automatic queuing for up to 10 seconds if peer not ready
- Built-in binary data support via ArrayBuffer

### brackets-terminal Current

**Asymmetric event flow:**
```javascript
// From Node (in TerminalDomain.js):
function emitTerminalEvent(eventName, payload) {
    if (!domainManager) {
        return;
    }
    domainManager.emitEvent('bracketsTerminal', eventName, [payload]);
}

// Listen on Phoenix side (in localNodeTransport.js):
domain.on('terminalData', function (event, payload) {
    trigger('data', payload);
});
```

**Limitations:**
- Node-only emission via domainManager
- Manual domain name prefixing
- No built-in ArrayBuffer support
- Requires domain manager instance

---

## 5. Version of Libraries Used

### Official Phoenix Code Template

**node/package.json dependencies:**
```json
{
  "dependencies": {
    "jquery": "^3.7.1",
    "sharp": "^0.33.3"
  }
}
```

- **sharp**: 0.33.3 (image processing library, stable recent version)
- **jquery**: 3.7.1 (included for compatibility)

### brackets-terminal Current

**node/package.json dependencies:**
```json
{
  "dependencies": {
    "node-pty": "^1.1.0"
  }
}
```

- **node-pty**: 1.1.0 (terminal/pseudo-terminal spawning)
- Uses for spawning shell processes with proper terminal emulation

**Additional vendor libraries (client-side):**
- **socket.io**: (in vendor/ folder, for remote terminal connections)
- **terminal.js**: (xterm-compatible terminal emulator)
- **tty.js**: (terminal protocol/emulation)

**Key Observation**: brackets-terminal uses **node-pty** for true terminal control, not available in the template. The template uses **sharp** for image processing.

---

## 6. Process & Terminal Spawning Comparison

### Official Phoenix Code Template

**For image processing (binary data):**
```javascript
// node/index.js
async function convertToGreyScale(imageName, imageArrayBuffer) {
    const outputBuffer = await sharp(imageArrayBuffer)
        .grayscale()
        .toBuffer();
    
    return {
        success: true,
        buffer: outputBuffer  // Binary data transfer
    };
}

// Phoenix side (main.js)
const { buffer, success } = await nodeConnector.execPeer(
    "convertToGreyScale",
    { imageName: "imageName" },
    imageArrayBuffer  // Pass ArrayBuffer as 2nd param
);
```

**No terminal spawning** - template focuses on simple Node.js utilities.

### brackets-terminal Current

**True Terminal Spawning with node-pty:**
```javascript
// node/TerminalDomain.js
function createTerminal(cols, rows, cwd, shell) {
    ensurePtyDependency();
    
    terminalId = 'local-' + (++terminalSequence);
    terminal = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: cols,
        rows: rows,
        cwd: cwd,
        env: process.env
    });
    
    trackTerminal(terminalId, terminal);
    return { id: terminalId, cols, rows, cwd, shell };
}
```

**Event-driven data flow:**
```javascript
// Track input/output
term.onData(function (data) {
    emitTerminalEvent('terminalData', { id: id, data: data });
});

// Handle process exit
term.onExit(function (exit) {
    emitTerminalEvent('terminalExit', { 
        id: id, 
        exitCode: exit.exitCode, 
        signal: exit.signal 
    });
});
```

**Terminal management:**
```javascript
writeTerminal(terminalId, data)      // Send input to terminal
resizeTerminal(terminalId, cols, rows) // Resize PTY
killTerminal(terminalId)             // Kill process
disposeAll()                         // Cleanup on exit
```

---

## 7. Summary of Key Differences

| Aspect | Official Template | brackets-terminal |
|--------|-------------------|-------------------|
| **API** | Modern NodeConnector | Legacy NodeDomain |
| **Node entry** | `node/index.js` with exports | `node/TerminalDomain.js` with init() |
| **Config** | `nodeIsRequired`, `main`, `npmInstall` | Missing `nodeIsRequired` |
| **Function calls** | `await nodeConnector.execPeer()` | `domain.exec()` with $.Deferred |
| **Events** | `triggerPeer()` / `.on()` | `emitEvent()` / `.on(eventName)` |
| **Async pattern** | Native async/await | Callback/Promise chains |
| **Auto-queuing** | Yes (10 sec timeout) | No |
| **Binary data** | Direct ArrayBuffer support | Manual serialization |
| **Use case** | General node utilities | Terminal emulation with PTY |
| **Complexity** | Simpler, fewer lines | More complex domain management |

---

## 8. Migration Path Recommendations

If modernizing brackets-terminal to use NodeConnector:

1. **Restructure node/ directory:**
   ```
   node/
   ├── index.js          (replace TerminalDomain.js)
   ├── terminalManager.js (extract logic)
   └── package.json
   ```

2. **Update package.json:**
   ```json
   {
     "nodeConfig": {
       "nodeIsRequired": true,
       "main": "node/index.js",
       "npmInstall": "node/"
     }
   }
   ```

3. **Simplify node/index.js:**
   - Remove `init(DomainManager)` function
   - Export terminal functions directly
   - Use `global.createNodeConnector()` at module load

4. **Update main.js:**
   - Replace NodeDomain with `NodeConnector.createNodeConnector()`
   - Change `domain.exec()` to `await nodeConnector.execPeer()`
   - Update event handling to simpler `.on()` pattern

5. **Benefits of migration:**
   - Cleaner, more maintainable code
   - Better compatibility with modern Phoenix Code
   - Simpler event handling
   - Automatic peer connection queuing
   - Less boilerplate registration code

---

## 9. Code Examples: Side-by-Side Comparison

### Creating a Terminal

**Modern (NodeConnector):**
```javascript
// Main thread (Phoenix)
const result = await nodeConnector.execPeer('createTerminal', 80, 24, '/home/user', '/bin/bash');

// Node side
async function createTerminal(cols, rows, cwd, shell) {
    const terminal = pty.spawn(shell, [], { cols, rows, cwd });
    return { id: 'term-id', cols, rows, cwd, shell };
}
exports.createTerminal = createTerminal;
```

**Legacy (NodeDomain):**
```javascript
// Main thread (Phoenix)
domainManager.exec('bracketsTerminal', 'createTerminal', cols, rows, cwd, shell)
    .done(function(result) { ... })
    .fail(function(error) { ... });

// Node side
function createTerminal(cols, rows, cwd, shell) {
    // ... manual validation
}
domainManager.registerCommand('bracketsTerminal', 'createTerminal', createTerminal, false);
```

### Emitting Terminal Output Events

**Modern (NodeConnector):**
```javascript
// In node/index.js
function setupDataHandling(terminalId) {
    terminal.onData(data => {
        nodeConnector.triggerPeer('terminalData', { id: terminalId, data });
    });
}

// Listen in main.js
nodeConnector.on('terminalData', (_event, payload) => {
    if (payload && terminals[payload.id]) {
        terminals[payload.id].write(payload.data);
    }
});
```

**Legacy (NodeDomain):**
```javascript
// In node/TerminalDomain.js
function emitTerminalEvent(eventName, payload) {
    if (!domainManager) return;
    domainManager.emitEvent('bracketsTerminal', eventName, [payload]);
}

term.onData(function (data) {
    emitTerminalEvent('terminalData', { id: id, data: data });
});

// Listen in main.js (via transport)
domain.on('terminalData', function (event, payload) {
    trigger('data', payload);
});
```

---

## Conclusion

The official Phoenix Code NodeConnector API is a **significant modernization** over the legacy Brackets NodeDomain API. It offers:

✅ **Cleaner code structure** - No domain registration boilerplate  
✅ **Better async support** - Native async/await instead of callbacks  
✅ **Automatic connection management** - 10-second queuing for peer readiness  
✅ **Simpler event handling** - Unified `triggerPeer()`/`.on()` pattern  
✅ **Binary data support** - ArrayBuffer transfer without serialization  
✅ **More maintainable** - Less configuration, more standard JavaScript  

**brackets-terminal represents an older architectural pattern** that still works but requires more boilerplate and manual domain management. The application logic (terminal spawning, PTY management) is sound and would be easily portable to the modern API with structural changes to how Phoenix and Node.js communicate.
