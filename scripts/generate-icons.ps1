# Rebuild the original, code-native wind mark at all PWA sizes.
# Run from any directory: powershell -File scripts/generate-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

function Write-KazeIcon([int]$size, [string]$fileName) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#191c17'))
    $graphics.ScaleTransform(($size / 512.0), ($size / 512.0))
    $gold = [System.Drawing.ColorTranslator]::FromHtml('#e1c475')
    $ring = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(140, $gold), 5)
    $stroke = New-Object System.Drawing.Pen($gold, 15)
    $stroke.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $stroke.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $stroke.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawEllipse($ring, 80, 80, 352, 352)

    $upper = New-Object System.Drawing.Drawing2D.GraphicsPath
    $upper.AddLine(142, 212, 289, 212)
    $upper.AddBezier(289, 212, 333, 212, 345, 151, 308, 151)
    $upper.AddBezier(308, 151, 290, 151, 279, 161, 279, 176)
    $graphics.DrawPath($stroke, $upper)

    $middle = New-Object System.Drawing.Drawing2D.GraphicsPath
    $middle.AddLine(142, 258, 326, 258)
    $middle.AddBezier(326, 258, 365, 258, 380, 221, 354, 205)
    $graphics.DrawPath($stroke, $middle)

    $lower = New-Object System.Drawing.Drawing2D.GraphicsPath
    $lower.AddLine(142, 304, 275, 304)
    $lower.AddBezier(275, 304, 319, 304, 333, 363, 294, 363)
    $lower.AddBezier(294, 363, 276, 363, 266, 353, 266, 339)
    $graphics.DrawPath($stroke, $lower)

    try {
        $bitmap.Save((Join-Path $projectRoot $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $upper.Dispose(); $middle.Dispose(); $lower.Dispose()
        $ring.Dispose(); $stroke.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
    }
}

Write-KazeIcon 192 'icon-192.png'
Write-KazeIcon 512 'icon-512.png'
Write-KazeIcon 512 'icon-maskable-512.png'
Write-KazeIcon 180 'apple-touch-icon.png'
