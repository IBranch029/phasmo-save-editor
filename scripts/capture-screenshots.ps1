<#
.SYNOPSIS
    Produces the screenshots used by the README.

.DESCRIPTION
    Launches the built application, captures the window with PrintWindow and
    writes the images into docs/screenshots.

    The capture process has to be DPI aware, otherwise Windows hands out
    virtualised coordinates and the window is cropped.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts/capture-screenshots.ps1
    powershell -ExecutionPolicy Bypass -File scripts/capture-screenshots.ps1 `
        -Exe "src-tauri\target\release\phasmo-save-editor.exe"
#>
param(
    [string]$Exe = "",
    [string]$OutputDirectory = "docs/screenshots",
    [string]$SaveDirectory = "",
    [int]$WaitSeconds = 10
)

$ErrorActionPreference = "Stop"

if (-not $Exe) {
    $Exe = Join-Path $PSScriptRoot "..\src-tauri\target\release\phasmo-save-editor.exe"
}
$Exe = [System.IO.Path]::GetFullPath($Exe)
if (-not (Test-Path $Exe)) {
    throw "The application was not found at $Exe. Run 'npm run tauri:build' first."
}

$OutputDirectory = [System.IO.Path]::GetFullPath(
    (Join-Path (Join-Path $PSScriptRoot "..") $OutputDirectory))
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class PhasmoCapture {
    [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, int data, IntPtr extra);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

# Per monitor aware v2 so that the window rectangle is reported in real pixels.
[PhasmoCapture]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null

function Get-WindowHandle {
    param([System.Diagnostics.Process]$Process)
    $Process.Refresh()
    return $Process.MainWindowHandle
}

function Save-Window {
    param([IntPtr]$Handle, [string]$Path)

    $rect = New-Object PhasmoCapture+RECT
    [PhasmoCapture]::GetWindowRect($Handle, [ref]$rect) | Out-Null
    $width = $rect.Right - $rect.Left
    $height = $rect.Bottom - $rect.Top
    if ($width -le 0 -or $height -le 0) { throw "The window has no size." }

    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $hdc = $graphics.GetHdc()
    # 2 = PW_RENDERFULLCONTENT, required for WebView2 surfaces.
    [PhasmoCapture]::PrintWindow($Handle, $hdc, 2) | Out-Null
    $graphics.ReleaseHdc($hdc)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Output "wrote $Path"
}

function Scroll-Window {
    param([IntPtr]$Handle, [int]$Notches)

    $rect = New-Object PhasmoCapture+RECT
    [PhasmoCapture]::GetWindowRect($Handle, [ref]$rect) | Out-Null
    $x = [int](($rect.Left + $rect.Right) / 2)
    $y = [int](($rect.Top + $rect.Bottom) / 2)
    [PhasmoCapture]::SetCursorPos($x, $y) | Out-Null
    Start-Sleep -Milliseconds 300
    for ($i = 0; $i -lt [Math]::Abs($Notches); $i++) {
        [PhasmoCapture]::mouse_event(0x0800, 0, 0, 120, [IntPtr]::Zero)
        Start-Sleep -Milliseconds 25
    }
    Start-Sleep -Milliseconds 800
}

function Click-Window {
    param([IntPtr]$Handle, [int]$OffsetX, [int]$OffsetY)

    $rect = New-Object PhasmoCapture+RECT
    [PhasmoCapture]::GetWindowRect($Handle, [ref]$rect) | Out-Null
    [PhasmoCapture]::SetCursorPos(($rect.Left + $OffsetX), ($rect.Top + $OffsetY)) | Out-Null
    Start-Sleep -Milliseconds 400
    [PhasmoCapture]::mouse_event(0x0002, 0, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 60
    [PhasmoCapture]::mouse_event(0x0004, 0, 0, 0, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 900
}

Write-Output "launching $Exe"
if ($SaveDirectory) {
    # Point the application at a different save folder (portable mode).
    $env:PHASMO_SAVE_DIR = $SaveDirectory
    Write-Output "using save folder $SaveDirectory"
}
$process = Start-Process -FilePath $Exe -PassThru
try {
    Start-Sleep -Seconds $WaitSeconds
    $handle = Get-WindowHandle -Process $process
    if ($handle -eq [IntPtr]::Zero) { throw "The application did not open a window." }
    [PhasmoCapture]::SetForegroundWindow($handle) | Out-Null
    Start-Sleep -Seconds 2

    # 1 - the dashboard
    Scroll-Window -Handle $handle -Notches 60
    Save-Window -Handle $handle -Path (Join-Path $OutputDirectory "dashboard.png")

    # 2 - the equipment list
    Scroll-Window -Handle $handle -Notches -14
    Save-Window -Handle $handle -Path (Join-Path $OutputDirectory "equipment.png")

    # 3 - the backup archive drawer
    Scroll-Window -Handle $handle -Notches 60
    Click-Window -Handle $handle -OffsetX 1365 -OffsetY 102
    Save-Window -Handle $handle -Path (Join-Path $OutputDirectory "backup-archive.png")
}
finally {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

Write-Output "done"
