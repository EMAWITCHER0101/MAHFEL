#define MyAppName "محفل"
#define MyAppVersion "1.0.0"
#define MyAppExeName "Mahfel.exe"

[Setup]
AppId={{E57A57A4-2C3E-4E2A-9D1B-7F3A0C2B9E11}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Mahfel
DefaultDirName={localappdata}\Programs\Mahfel
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=C:\Users\EMAD\AppData\Local\Temp\opencode\inno-out
OutputBaseFilename=Mahfel-Setup
SetupIconFile=E:\soha\electron\logo.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
ShowLanguageDialog=no
ArchitecturesInstallIn64BitMode=x64compatible

[Tasks]
Name: "desktopicon"; Description: "ایجاد آیکون روی دسکتاپ"; GroupDescription: "شورتکات‌ها:"; Flags: checkedonce
Name: "pin"; Description: "پین کردن محفل به تسکبار"; GroupDescription: "شورتکات‌ها:"; Flags: checkedonce

[Files]
Source: "E:\soha\electron\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""$sh = New-Object -ComObject Shell.Application; $lnk = $sh.Namespace('{userprograms}').ParseName('{#MyAppName}.lnk'); $v = $lnk.Verbs() | Where-Object {{ $_.Name -match 'pin|تسک' }} | Select-Object -First 1; if ($v) {{ $v.DoIt() }}"""; Tasks: pin; Flags: runhidden nowait
Filename: "{app}\{#MyAppExeName}"; Description: "اجرای محفل"; Flags: nowait postinstall skipifsilent

[Code]
const
  ERROR_ALREADY_EXISTS = 183;

var
  SetupMutex: THandle;

function CreateMutexW(lpMutexAttributes: Integer; bInitialOwner: Boolean; lpName: string): THandle;
  external 'CreateMutexW@kernel32.dll stdcall';
function GetLastError: Integer;
  external 'GetLastError@kernel32.dll stdcall';
function CloseHandle(hObject: THandle): Boolean;
  external 'CloseHandle@kernel32.dll stdcall';
function FindWindowW(ClassName: string; WindowName: string): HWND;
  external 'FindWindowW@user32.dll stdcall';
function SetForegroundWindow(hWnd: HWND): Boolean;
  external 'SetForegroundWindow@user32.dll stdcall';

function InitializeSetup(): Boolean;
begin
  Result := True;
  SetupMutex := CreateMutexW(0, False, 'MahfelSetup_SingleInstance');
  if (SetupMutex <> 0) and (GetLastError = ERROR_ALREADY_EXISTS) then
  begin
    SetForegroundWindow(FindWindowW('#32770', 'Setup - {#MyAppName} {#MyAppVersion}'));
    Result := False;
  end;
end;

procedure DeinitializeSetup();
begin
  if SetupMutex <> 0 then
    CloseHandle(SetupMutex);
end;
