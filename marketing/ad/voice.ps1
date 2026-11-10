# Speaks each voiceover line to its own WAV with the Windows "Mark" voice (WinRT OneCore),
# so the renderer can place every line on its scene. Placeholder narration: a real person
# reading vo-script.txt and dropping their recording in will sound far better.
param([string]$OutDir = "vo")

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
function Await($op, [Type]$type) {
  $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
  $t.Wait(-1) | Out-Null
  $t.Result
}

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like '*Mark*' } | Select-Object -First 1
if ($voice) { $synth.Voice = $voice }

$lines = @(
  @{ id = '01'; ssml = 'Friday.<break time="250ms"/> Payroll''s due.' },
  @{ id = '02'; ssml = 'And nobody remembers their hours.' },
  @{ id = '03'; ssml = 'Every.<break time="200ms"/> Single.<break time="200ms"/> Week.' },
  @{ id = '04'; ssml = 'So we switched to Constra.' },
  @{ id = '05'; ssml = 'The crew clocks in on their own phone.' },
  @{ id = '06'; ssml = 'Someone walks off site on the clock?<break time="200ms"/> I know.' },
  @{ id = '07'; ssml = 'Tomorrow''s plan goes out to every phone.' },
  @{ id = '08'; ssml = 'Timesheets come out with my logo,<break time="150ms"/> straight to payroll.' },
  @{ id = '09'; ssml = 'Hours.<break time="120ms"/> Crew.<break time="120ms"/> Job costs.<break time="200ms"/> One app.' },
  @{ id = '10'; ssml = 'Constra.<break time="250ms"/> Built for crews,<break time="120ms"/> not desks.<break time="250ms"/> Free to start at get constra dot com.' }
)

New-Item -ItemType Directory -Force $OutDir | Out-Null
foreach ($l in $lines) {
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><prosody rate='+6%' pitch='-2%'>$($l.ssml)</prosody></speak>"
  $stream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $size = [uint32]$stream.Size
  $null = Await ($reader.LoadAsync($size)) ([uint32])
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  [System.IO.File]::WriteAllBytes((Join-Path (Resolve-Path $OutDir) "vo-$($l.id).wav"), $bytes)
  "vo-$($l.id).wav $size bytes"
}
