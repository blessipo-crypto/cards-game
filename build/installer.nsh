!include "LogicLib.nsh"

!macro customInstall
  ; Register standard Windows Apps & Features metadata cleanly under HKCU
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayName" "Royal Velvet Suite"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "Publisher" "Royal Velvet Suite"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "NoRepair" 1

  ; Expose explicit Uninstaller shortcut inside Start Menu program folder
  CreateDirectory "$SMPROGRAMS\Royal Velvet Suite"
  CreateShortCut "$SMPROGRAMS\Royal Velvet Suite\Désinstaller Royal Velvet Suite.lnk" "$INSTDIR\Uninstall Royal Velvet Suite.exe"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\Royal Velvet Suite\Désinstaller Royal Velvet Suite.lnk"
  RMDir "$SMPROGRAMS\Royal Velvet Suite"

  ; Prompt user whether to also remove saved bankroll & table preferences
  ${IfNot} ${Silent}
    MessageBox MB_YESNO|MB_ICONQUESTION "Souhaitez-vous également supprimer vos données locales et votre bankroll enregistrée dans AppData ?" IDNO skip_appdata_cleanup
      RMDir /r "$APPDATA\Royal Velvet Suite"
      RMDir /r "$LOCALAPPDATA\royal-velvet-suite-updater"
    skip_appdata_cleanup:
  ${EndIf}
!macroend
