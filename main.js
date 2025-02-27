const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  // Open folder dialog when requested
  ipcMain.handle("open-folder-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const folderPath = result.filePaths[0];

    // Get list of files and directories in the folder
    const files = fs.readdirSync(folderPath).map((file) => ({
      name: file,
      path: path.join(folderPath, file),
      isDirectory: fs.statSync(path.join(folderPath, file)).isDirectory(),
    }));

    return { folderPath, files };
  });

  // Handle file or directory opening
  ipcMain.on("open-file", (event, filePath) => {
    const fileExt = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      const files = fs.readdirSync(filePath).map((file) => ({
        name: file,
        path: path.join(filePath, file),
        isDirectory: fs.statSync(path.join(filePath, file)).isDirectory(),
      }));
      event.reply("directory-opened", { folderPath: filePath, files });
    } else {
      openFile(filePath);
    }
  });
});

function openFile(filePath) {
  const fileExt = path.extname(filePath).toLowerCase();
  
  if ([".jpg", ".jpeg", ".png", ".gif", ".bmp"].includes(fileExt)) {
    openViewer("viewer.html", filePath);
  } else if (fileExt === ".pdf") {
    openViewer("pdf-viewer.html", filePath);
  } else if ([".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"].includes(fileExt)) {
    // Open Office files with LibreOffice or default app
    shell.openPath(filePath).catch((err) => console.error("Error opening file:", err));
  } else {
    openViewer("text-viewer.html", filePath);
  }
}

function openViewer(viewerFile, filePath) {
  const viewerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  viewerWindow.loadURL(`file://${__dirname}/${viewerFile}?file=${encodeURIComponent(filePath)}`);
}

// Close app when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
