# Speaks each line of talk-script to its own WAV with the Windows "Mark" voice (WinRT OneCore).
#   powershell -File voice.ps1 -OutDir ..\..\.tmp-ad\talk
param([string]$OutDir = "..\..\.tmp-ad\talk")
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
function Await($op, [Type]$type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like '*Mark*' } | Select-Object -First 1
if ($voice) { $synth.Voice = $voice }

# A warm, unhurried foreman: a touch slower, the pauses where a person would breathe
$P = '<prosody rate="+2%" pitch="-2%">'
$lines = @(
  'Hey,<break time="150ms"/> I''m Mac.<break time="120ms"/> I run a framing crew.',
  'Fridays used to mean chasing hours.<break time="200ms"/> Who worked Tuesday?<break time="150ms"/> Was Jess on Queen Street,<break time="100ms"/> or the other job?',
  'Then I put my crew on Constra.',
  'Everyone clocks in on their own phone,<break time="100ms"/> with a photo and their location.<break time="180ms"/> So I know who''s really on site.',
  'And if someone walks off the job on the clock?<break time="200ms"/> My phone tells me.<break time="180ms"/> The exact time.<break time="120ms"/> How far they went.',
  'Come Friday,<break time="100ms"/> the timesheets are just there.<break time="180ms"/> My logo on top.<break time="120ms"/> PDF or Excel,<break time="100ms"/> overtime worked out.',
  'Estimates,<break time="90ms"/> invoices,<break time="90ms"/> R F Is,<break time="90ms"/> change orders.<break time="180ms"/> One app,<break time="100ms"/> and it works when the signal drops.',
  'It''s free while it''s launching.<break time="180ms"/> Get your crew on it before Monday.',
  'Constra.<break time="250ms"/> Run the job,<break time="200ms"/> not the paperwork.'
)
for ($i = 0; $i -lt $lines.Count; $i++) {
  $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">' + $P + $lines[$i] + '</prosody></speak>'
  $stream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream)
  $null = Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
  $bytes = New-Object byte[] $stream.Size
  $reader.ReadBytes($bytes)
  $file = Join-Path $OutDir ("vo-{0:00}.wav" -f ($i + 1))
  [System.IO.File]::WriteAllBytes($file, $bytes)
  "{0}  {1:N1}s" -f (Split-Path $file -Leaf), ($stream.Size / 96000)
}
