!include "MUI2.nsh"

!ifndef BUILD_UNINSTALLER
Var /GLOBAL desktopShortcutWanted
Var /GLOBAL pinShortcutWanted
Var ShortcutsDialog
Var DesktopCheckbox
Var PinCheckbox
!endif

!macro customPageAfterChangeDir
  Page custom shortcutsPage shortcutsLeave
!macroend

!ifndef BUILD_UNINSTALLER
Function shortcutsPage
  ${If} ${Silent}
    Abort
  ${EndIf}
  StrCpy $desktopShortcutWanted "1"
  StrCpy $pinShortcutWanted "1"
  !insertmacro MUI_HEADER_TEXT "شورتکات‌ها" "انتخاب کنید محفل کجا دیده شود"
  nsDialogs::Create 1018
  Pop $ShortcutsDialog
  ${NSD_CreateCheckbox} 0 12u 100% 12u "ایجاد آیکون روی دسکتاپ"
  Pop $DesktopCheckbox
  ${NSD_CreateCheckbox} 0 34u 100% 12u "پین کردن محفل به تسکبار"
  Pop $PinCheckbox
  ${NSD_SetState} $DesktopCheckbox ${BST_CHECKED}
  ${NSD_SetState} $PinCheckbox ${BST_CHECKED}
  nsDialogs::Show
FunctionEnd

Function shortcutsLeave
  ${NSD_GetState} $DesktopCheckbox $0
  StrCpy $desktopShortcutWanted $0
  ${NSD_GetState} $PinCheckbox $1
  StrCpy $pinShortcutWanted $1
FunctionEnd

Function StartApp
  ExecShell "" "$INSTDIR\${PRODUCT_FILENAME}.exe" ""
FunctionEnd

Function shortcutsApply
  ${IfNot} ${Silent}
    ${if} $desktopShortcutWanted == "0"
      Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
    ${endif}
    ${if} $pinShortcutWanted == "1"
      nsExec::Exec 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$$sh = New-Object -ComObject Shell.Application; $$lnk = $$sh.Namespace(''$SMPROGRAMS'').ParseName(''${SHORTCUT_NAME}.lnk''); if ($$lnk) { $$lnk.InvokeVerb(''pin to tas&kbar'') }"'
    ${endif}
  ${EndIf}
FunctionEnd
!endif

!macro customFinishPage
  !define MUI_PAGE_CUSTOMFUNCTION_PRE shortcutsApply
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !insertmacro MUI_PAGE_FINISH
!macroend
