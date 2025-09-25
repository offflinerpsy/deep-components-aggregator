; HDR Toggle AutoHotkey Script
; Альтернативные горячие клавиши для переключения HDR
; Установите AutoHotkey v2: https://www.autohotkey.com/

#NoEnv
#SingleInstance Force
SendMode Input
SetWorkingDir %A_ScriptDir%

; Win+Alt+B - Переключение HDR (основная комбинация)
#!b::
ToggleHDR()
return

; Ctrl+Shift+H - Альтернативная комбинация
^+h::
ToggleHDR()
return

; Функция переключения HDR через настройки дисплея
ToggleHDR() {
    ; Показать уведомление
    TrayTip, HDR Toggle, Переключение HDR..., 1
    
    ; Открыть настройки дисплея
    Run, ms-settings:display
    
    ; Ждём открытия окна
    WinWait, Settings,, 3
    if ErrorLevel {
        TrayTip, HDR Toggle, Не удалось открыть настройки, 2
        return
    }
    
    ; Активируем окно
    WinActivate, Settings
    Sleep, 500
    
    ; Навигация к HDR переключателю
    ; Tab до раздела HDR (может потребоваться настройка количества)
    Send, {Tab 10}
    Sleep, 100
    
    ; Нажимаем пробел для переключения
    Send, {Space}
    Sleep, 500
    
    ; Закрываем настройки
    Send, !{F4}
    
    ; Уведомление о завершении
    TrayTip, HDR Toggle, HDR переключен!, 2
}

; Win+Alt+H - Включить HDR напрямую
#!h::
EnableHDR()
return

; Win+Alt+N - Выключить HDR напрямую  
#!n::
DisableHDR()
return

EnableHDR() {
    ; Используем PowerShell для включения HDR
    Run, powershell.exe -WindowStyle Hidden -Command "Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\VideoSettings' -Name 'EnableHDRForPlayback' -Value 1",, Hide
    TrayTip, HDR, HDR включен, 2
}

DisableHDR() {
    ; Используем PowerShell для выключения HDR
    Run, powershell.exe -WindowStyle Hidden -Command "Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\VideoSettings' -Name 'EnableHDRForPlayback' -Value 0",, Hide
    TrayTip, HDR, HDR выключен, 2
}

; Ctrl+Alt+R - Перезапустить Explorer (если HDR завис)
^!r::
MsgBox, 4,, Перезапустить Windows Explorer?
IfMsgBox Yes
{
    Process, Close, explorer.exe
    Sleep, 2000
    Run, explorer.exe
    TrayTip, Explorer, Explorer перезапущен, 2
}
return

; Показать меню при клике на иконку в трее
Menu, Tray, NoStandard
Menu, Tray, Add, Переключить HDR (Win+Alt+B), ToggleHDRMenu
Menu, Tray, Add, Включить HDR (Win+Alt+H), EnableHDRMenu
Menu, Tray, Add, Выключить HDR (Win+Alt+N), DisableHDRMenu
Menu, Tray, Add
Menu, Tray, Add, Перезапустить Explorer (Ctrl+Alt+R), RestartExplorerMenu
Menu, Tray, Add
Menu, Tray, Add, Выход, ExitScript

ToggleHDRMenu:
ToggleHDR()
return

EnableHDRMenu:
EnableHDR()
return

DisableHDRMenu:
DisableHDR()
return

RestartExplorerMenu:
Process, Close, explorer.exe
Sleep, 2000
Run, explorer.exe
return

ExitScript:
ExitApp
