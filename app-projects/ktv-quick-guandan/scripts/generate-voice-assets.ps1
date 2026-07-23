$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$output = Join-Path $PSScriptRoot "..\public\assets\audio"
New-Item -ItemType Directory -Force -Path $output | Out-Null
function ConvertFrom-CodePoint([int[]]$codes) { return -join ($codes | ForEach-Object { [char]$_ }) }
$clips = [ordered]@{
  "pass" = ConvertFrom-CodePoint @(0x4E0D, 0x8981)
  "single" = ConvertFrom-CodePoint @(0x5355, 0x5F20)
  "pair" = ConvertFrom-CodePoint @(0x5BF9, 0x5B50)
  "triple" = ConvertFrom-CodePoint @(0x4E09, 0x5F20)
  "full-house" = ConvertFrom-CodePoint @(0x4E09, 0x5E26, 0x4E8C)
  "straight" = ConvertFrom-CodePoint @(0x987A, 0x5B50)
  "triple-pairs" = ConvertFrom-CodePoint @(0x4E09, 0x8FDE, 0x5BF9)
  "steel-plate" = ConvertFrom-CodePoint @(0x94A2, 0x677F)
  "bomb-4" = ConvertFrom-CodePoint @(0x56DB, 0x70B8)
  "bomb-5" = ConvertFrom-CodePoint @(0x4E94, 0x70B8)
  "bomb-6" = ConvertFrom-CodePoint @(0x516D, 0x70B8)
  "bomb-7" = ConvertFrom-CodePoint @(0x4E03, 0x70B8)
  "bomb-8" = ConvertFrom-CodePoint @(0x516B, 0x70B8)
  "straight-flush" = ConvertFrom-CodePoint @(0x540C, 0x82B1, 0x987A)
  "joker-bomb" = ConvertFrom-CodePoint @(0x56DB, 0x738B, 0x70B8)
  "rank-2" = ConvertFrom-CodePoint @(0x4E8C)
  "rank-3" = ConvertFrom-CodePoint @(0x4E09)
  "rank-4" = ConvertFrom-CodePoint @(0x56DB)
  "rank-5" = ConvertFrom-CodePoint @(0x4E94)
  "rank-6" = ConvertFrom-CodePoint @(0x516D)
  "rank-7" = ConvertFrom-CodePoint @(0x4E03)
  "rank-8" = ConvertFrom-CodePoint @(0x516B)
  "rank-9" = ConvertFrom-CodePoint @(0x4E5D)
  "rank-10" = ConvertFrom-CodePoint @(0x5341)
  "rank-11" = "J"
  "rank-12" = "Q"
  "rank-13" = "K"
  "rank-14" = "A"
  "rank-16" = ConvertFrom-CodePoint @(0x5C0F, 0x738B)
  "rank-17" = ConvertFrom-CodePoint @(0x5927, 0x738B)
}
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.SelectVoice("Microsoft Huihui Desktop")
$voice.Rate = 1
$voice.Volume = 100
foreach ($clip in $clips.GetEnumerator()) {
  $file = Join-Path $output ($clip.Key + ".wav")
  $voice.SetOutputToWaveFile($file)
  $voice.Speak($clip.Value)
  $voice.SetOutputToNull()
}
$voice.Dispose()
Write-Output $output
