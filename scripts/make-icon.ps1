Add-Type -AssemblyName System.Drawing

$size = 1024
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# --- Background: deep charcoal --------------------------------------------------
$graphics.Clear([System.Drawing.Color]::FromArgb(255, 9, 11, 16))

# --- Warm radial core ------------------------------------------------------------
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(96, 96, 832, 832)
$glow = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
$glow.CenterColor = [System.Drawing.Color]::FromArgb(165, 229, 154, 69)
$glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 229, 154, 69))
$graphics.FillEllipse($glow, 96, 96, 832, 832)
$glowPath.Dispose()

# --- Outer ring ------------------------------------------------------------------
$ringPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 240, 173, 92)), 30
$ringPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$graphics.DrawEllipse($ringPen, 164, 164, 696, 696)

$thinRingPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(130, 229, 154, 69)), 7
$graphics.DrawEllipse($thinRingPen, 212, 212, 600, 600)

# --- Spirit box signal meter -----------------------------------------------------
$bars = @(
    @{ X = 362; H = 200; Bright = $false },
    @{ X = 475; H = 350; Bright = $true  },
    @{ X = 588; H = 265; Bright = $false }
)

foreach ($bar in $bars) {
    if ($bar.Bright) {
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 226, 171))
    } else {
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 229, 154, 69))
    }
    $y = 516 - $bar.H
    $graphics.FillRectangle($brush, $bar.X, $y, 78, $bar.H)
    $brush.Dispose()
}

# Base line of the meter
$baseBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 229, 154, 69))
$graphics.FillRectangle($baseBrush, 334, 528, 360, 11)
$baseBrush.Dispose()

$iconDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\src-tauri\icons'))
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
$output = Join-Path $iconDir 'source-icon.png'
$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Output "wrote $output"
