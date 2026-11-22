'use strict';
const $ = id => document.getElementById(id);
const models = [
  {name:'ChatGPT',color:'#a0dfc4',symbol:'GPT',icon:'openai',angle:'拆解路径',slot:1},
  {name:'Claude',color:'#e8b393',symbol:'C',icon:'claude-color',angle:'寻找本质',slot:3},
  {name:'DeepSeek',color:'#89beed',symbol:'DS',icon:'deepseek-color',angle:'推演验证',slot:0},
  {name:'Gemini',color:'#9eb6ff',symbol:'G',icon:'gemini-color',angle:'连接可能',slot:2},
  {name:'Grok',color:'#d2c7e8',symbol:'g',icon:'grok',angle:'换个问法',slot:4},
  {name:'火山方舟',color:'#45c9ff',symbol:'ARK',icon:'ark',angle:'拓展思路',slot:5,apiOnly:true}
];
const logoSources = {"openai": "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZWVlYWY2IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGhlaWdodD0iMWVtIiBzdHlsZT0iZmxleDpub25lO2xpbmUtaGVpZ2h0OjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjFlbSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+T3BlbkFJPC90aXRsZT48cGF0aCBkPSJNOS4yMDUgOC42NTh2LTIuMjZjMC0uMTkuMDcyLS4zMzMuMjM4LS40MjhsNC41NDMtMi42MTZjLjYxOS0uMzU3IDEuMzU2LS41MjMgMi4xMTctLjUyMyAyLjg1NCAwIDQuNjYyIDIuMjEyIDQuNjYyIDQuNTY2IDAgLjE2NyAwIC4zNTctLjAyNC41NDdsLTQuNzEtMi43NTlhLjc5Ny43OTcgMCAwMC0uODU2IDBsLTUuOTcgMy40NzN6bTEwLjYwOSA4LjhWMTIuMDZjMC0uMzMzLS4xNDMtLjU3LS40MjktLjczN2wtNS45Ny0zLjQ3MyAxLjk1LTEuMTE4YS40MzMuNDMzIDAgMDEuNDc2IDBsNC41NDMgMi42MTdjMS4zMDkuNzYgMi4xODkgMi4zNzggMi4xODkgMy45NDggMCAxLjgwOC0xLjA3IDMuNDczLTIuNzYgNC4xNjN6TTcuODAyIDEyLjcwM2wtMS45NS0xLjE0MmMtLjE2Ny0uMDk1LS4yMzktLjIzOC0uMjM5LS40MjhWNS44OTljMC0yLjU0NSAxLjk1LTQuNDcyIDQuNTkxLTQuNDcyIDEgMCAxLjkyNy4zMzMgMi43MTIuOTI4TDguMjMgNS4wNjdjLS4yODUuMTY2LS40MjguNDA0LS40MjguNzM3djYuODk4ek0xMiAxNS4xMjhsLTIuNzk1LTEuNTd2LTMuMzNMMTIgOC42NThsMi43OTUgMS41N3YzLjMzTDEyIDE1LjEyOHptMS43OTYgNy4yM2MtMSAwLTEuOTI3LS4zMzItMi43MTItLjkyN2w0LjY4Ni0yLjcxMmMuMjg1LS4xNjYuNDI4LS40MDQuNDI4LS43Mzd2LTYuODk4bDEuOTc0IDEuMTQyYy4xNjcuMDk1LjIzOC4yMzguMjM4LjQyOHY1LjIzM2MwIDIuNTQ1LTEuOTc0IDQuNDcyLTQuNjE0IDQuNDcyem0tNS42MzctNS4zMDNsLTQuNTQ0LTIuNjE3Yy0xLjMwOC0uNzYxLTIuMTg4LTIuMzc4LTIuMTg4LTMuOTQ4QTQuNDgyIDQuNDgyIDAgMDE0LjIxIDYuMzI3djUuNDIzYzAgLjMzMy4xNDMuNTcxLjQyOC43MzhsNS45NDcgMy40NDktMS45NSAxLjExOGEuNDMyLjQzMiAwIDAxLS40NzYgMHptLS4yNjIgMy45Yy0yLjY4OCAwLTQuNjYyLTIuMDIxLTQuNjYyLTQuNTE5IDAtLjE5LjAyNC0uMzguMDQ3LS41N2w0LjY4NiAyLjcxYy4yODYuMTY3LjU3MS4xNjcuODU2IDBsNS45Ny0zLjQ0OHYyLjI2YzAgLjE5LS4wNy4zMzMtLjIzNy40MjhsLTQuNTQzIDIuNjE2Yy0uNjE5LjM1Ny0xLjM1Ni41MjMtMi4xMTcuNTIzem01Ljg5OSAyLjgzYTUuOTQ3IDUuOTQ3IDAgMDA1LjgyNy00Ljc1NkMyMi4yODcgMTguMzM5IDI0IDE1Ljg0IDI0IDEzLjI5NmMwLTEuNjY1LS43MTMtMy4yODItMS45OTgtNC40NDguMTE5LS41LjE5LS45OTkuMTktMS40OTggMC0zLjQwMS0yLjc1OS01Ljk0Ny01Ljk0Ni01Ljk0Ny0uNjQyIDAtMS4yNi4wOTUtMS44OC4zMUE1Ljk2MiA1Ljk2MiAwIDAwMTAuMjA1IDBhNS45NDcgNS45NDcgMCAwMC01LjgyNyA0Ljc1N0MxLjcxMyA1LjQ0NyAwIDcuOTQ1IDAgMTAuNDljMCAxLjY2Ni43MTMgMy4yODMgMS45OTggNC40NDgtLjExOS41LS4xOSAxLS4xOSAxLjQ5OSAwIDMuNDAxIDIuNzU5IDUuOTQ2IDUuOTQ2IDUuOTQ2LjY0MiAwIDEuMjYtLjA5NSAxLjg4LS4zMDlhNS45NiA1Ljk2IDAgMDA0LjE2MiAxLjcxM3oiPjwvcGF0aD48L3N2Zz4=", "claude-color": "data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkNsYXVkZTwvdGl0bGU+PHBhdGggZD0iTTQuNzA5IDE1Ljk1NWw0LjcyLTIuNjQ3LjA4LS4yMy0uMDgtLjEyOEg5LjJsLS43OS0uMDQ4LTIuNjk4LS4wNzMtMi4zMzktLjA5Ny0yLjI2Ni0uMTIyLS41NzEtLjEyMUwwIDExLjc4NGwuMDU1LS4zNTIuNDgtLjMyMS42ODYuMDYgMS41Mi4xMDMgMi4yNzguMTU4IDEuNjUyLjA5NyAyLjQ0OS4yNTVoLjM4OWwuMDU1LS4xNTctLjEzNC0uMDk4LS4xMDMtLjA5Ny0yLjM1OC0xLjU5Ni0yLjU1Mi0xLjY4OC0xLjMzNi0uOTcyLS43MjQtLjQ5MS0uMzY0LS40NjItLjE1OC0xLjAwOC42NTYtLjcyMi44ODEuMDYuMjI1LjA2MS44OTMuNjg2IDEuOTA4IDEuNDc2IDIuNDkxIDEuODMzLjM2NS4zMDQuMTQ1LS4xMDMuMDE5LS4wNzMtLjE2NC0uMjc0LTEuMzU1LTIuNDQ2LTEuNDQ2LTIuNDktLjY0NC0xLjAzMi0uMTctLjYxOWEyLjk3IDIuOTcgMCAwMS0uMTA0LS43MjlMNi4yODMuMTM0IDYuNjk2IDBsLjk5Ni4xMzQuNDIuMzY0LjYyIDEuNDE0IDEuMDAyIDIuMjI5IDEuNTU1IDMuMDMuNDU2Ljg5OC4yNDMuODMyLjA5MS4yNTVoLjE1OFY5LjAxbC4xMjgtMS43MDYuMjM3LTIuMDk1LjIzLTIuNjk1LjA4LS43Ni4zNzYtLjkxLjc0Ny0uNDkyLjU4NC4yOC40OC42ODUtLjA2Ny40NDQtLjI4NiAxLjg1MS0uNTU5IDIuOTAzLS4zNjQgMS45NDJoLjIxMmwuMjQzLS4yNDIuOTg1LTEuMzA2IDEuNjUyLTIuMDY0LjczLS44Mi44NS0uOTA0LjU0Ny0uNDMxaDEuMDMzbC43NiAxLjEyOS0uMzQgMS4xNjYtMS4wNjQgMS4zNDctLjg4MSAxLjE0Mi0xLjI2NCAxLjctLjc5IDEuMzYuMDczLjExLjE4OC0uMDIgMi44NTYtLjYwNiAxLjU0My0uMjggMS44NDEtLjMxNS44MzMuMzg4LjA5MS4zOTUtLjMyOC44MDctMS45NjkuNDg2LTIuMzA5LjQ2Mi0zLjQzOS44MTMtLjA0Mi4wMy4wNDkuMDYxIDEuNTQ5LjE0Ni42NjIuMDM2aDEuNjIybDMuMDIuMjI1Ljc5LjUyMi40NzQuNjM4LS4wNzkuNDg1LTEuMjE1LjYyLTEuNjQtLjM4OS0zLjgyOS0uOTEtMS4zMTItLjMyOWgtLjE4MnYuMTFsMS4wOTMgMS4wNjggMi4wMDYgMS44MSAyLjUwOSAyLjMzLjEyNy41NzgtLjMyMi40NTUtLjM0LS4wNDktMi4yMDUtMS42NTctLjg1MS0uNzQ3LTEuOTI2LTEuNjJoLS4xMjh2LjE3bC40NDQuNjQ5IDIuMzQ1IDMuNTIxLjEyMiAxLjA4LS4xNy4zNTMtLjYwOC4yMTMtLjY2OC0uMTIyLTEuMzc0LTEuOTI1LTEuNDE1LTIuMTY3LTEuMTQzLTEuOTQzLS4xNC4wOC0uNjc0IDcuMjU0LS4zMTYuMzctLjcyOS4yOC0uNjA3LS40NjEtLjMyMi0uNzQ3LjMyMi0xLjQ3Ni4zODktMS45MjQuMzE1LTEuNTMuMjg2LTEuOS4xNy0uNjMyLS4wMTItLjA0Mi0uMTQuMDE4LTEuNDM0IDEuOTY3LTIuMTggMi45NDUtMS43MjYgMS44NDUtLjQxNC4xNjQtLjcxNy0uMzcuMDY3LS42NjIuNDAxLS41ODkgMi4zODgtMy4wMzYgMS40NC0xLjg4Mi45My0xLjA4Ni0uMDA2LS4xNThoLS4wNTVMNC4xMzIgMTguNTZsLTEuMTMuMTQ2LS40ODctLjQ1Ni4wNjEtLjc0Ni4yMzEtLjI0MyAxLjkwOC0xLjMxMi0uMDA2LjAwNnoiIGZpbGw9IiNEOTc3NTciIGZpbGwtcnVsZT0ibm9uemVybyI+PC9wYXRoPjwvc3ZnPg==", "gemini-color": "data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkdlbWluaTwvdGl0bGU+PHBhdGggZD0iTTIwLjYxNiAxMC44MzVhMTQuMTQ3IDE0LjE0NyAwIDAxLTQuNDUtMy4wMDEgMTQuMTExIDE0LjExMSAwIDAxLTMuNjc4LTYuNDUyLjUwMy41MDMgMCAwMC0uOTc1IDAgMTQuMTM0IDE0LjEzNCAwIDAxLTMuNjc5IDYuNDUyIDE0LjE1NSAxNC4xNTUgMCAwMS00LjQ1IDMuMDAxYy0uNjUuMjgtMS4zMTguNTA1LTIuMDAyLjY3OGEuNTAyLjUwMiAwIDAwMCAuOTc1Yy42ODQuMTcyIDEuMzUuMzk3IDIuMDAyLjY3N2ExNC4xNDcgMTQuMTQ3IDAgMDE0LjQ1IDMuMDAxIDE0LjExMiAxNC4xMTIgMCAwMTMuNjc5IDYuNDUzLjUwMi41MDIgMCAwMC45NzUgMGMuMTcyLS42ODUuMzk3LTEuMzUxLjY3Ny0yLjAwM2ExNC4xNDUgMTQuMTQ1IDAgMDEzLjAwMS00LjQ1IDE0LjExMyAxNC4xMTMgMCAwMTYuNDUzLTMuNjc4LjUwMy41MDMgMCAwMDAtLjk3NSAxMy4yNDUgMTMuMjQ1IDAgMDEtMi4wMDMtLjY3OHoiIGZpbGw9IiMzMTg2RkYiPjwvcGF0aD48cGF0aCBkPSJNMjAuNjE2IDEwLjgzNWExNC4xNDcgMTQuMTQ3IDAgMDEtNC40NS0zLjAwMSAxNC4xMTEgMTQuMTExIDAgMDEtMy42NzgtNi40NTIuNTAzLjUwMyAwIDAwLS45NzUgMCAxNC4xMzQgMTQuMTM0IDAgMDEtMy42NzkgNi40NTIgMTQuMTU1IDE0LjE1NSAwIDAxLTQuNDUgMy4wMDFjLS42NS4yOC0xLjMxOC41MDUtMi4wMDIuNjc4YS41MDIuNTAyIDAgMDAwIC45NzVjLjY4NC4xNzIgMS4zNS4zOTcgMi4wMDIuNjc3YTE0LjE0NyAxNC4xNDcgMCAwMTQuNDUgMy4wMDEgMTQuMTEyIDE0LjExMiAwIDAxMy42NzkgNi40NTMuNTAyLjUwMiAwIDAwLjk3NSAwYy4xNzItLjY4NS4zOTctMS4zNTEuNjc3LTIuMDAzYTE0LjE0NSAxNC4xNDUgMCAwMTMuMDAxLTQuNDUgMTQuMTEzIDE0LjExMyAwIDAxNi40NTMtMy42NzguNTAzLjUwMyAwIDAwMC0uOTc1IDEzLjI0NSAxMy4yNDUgMCAwMS0yLjAwMy0uNjc4eiIgZmlsbD0idXJsKCNsb2JlLWljb25zLWdlbWluaS0wLV9SXzBfKSI+PC9wYXRoPjxwYXRoIGQ9Ik0yMC42MTYgMTAuODM1YTE0LjE0NyAxNC4xNDcgMCAwMS00LjQ1LTMuMDAxIDE0LjExMSAxNC4xMTEgMCAwMS0zLjY3OC02LjQ1Mi41MDMuNTAzIDAgMDAtLjk3NSAwIDE0LjEzNCAxNC4xMzQgMCAwMS0zLjY3OSA2LjQ1MiAxNC4xNTUgMTQuMTU1IDAgMDEtNC40NSAzLjAwMWMtLjY1LjI4LTEuMzE4LjUwNS0yLjAwMi42NzhhLjUwMi41MDIgMCAwMDAgLjk3NWMuNjg0LjE3MiAxLjM1LjM5NyAyLjAwMi42NzdhMTQuMTQ3IDE0LjE0NyAwIDAxNC40NSAzLjAwMSAxNC4xMTIgMTQuMTEyIDAgMDEzLjY3OSA2LjQ1My41MDIuNTAyIDAgMDAuOTc1IDBjLjE3Mi0uNjg1LjM5Ny0xLjM1MS42NzctMi4wMDNhMTQuMTQ1IDE0LjE0NSAwIDAxMy4wMDEtNC40NSAxNC4xMTMgMTQuMTEzIDAgMDE2LjQ1My0zLjY3OC41MDMuNTAzIDAgMDAwLS45NzUgMTMuMjQ1IDEzLjI0NSAwIDAxLTIuMDAzLS42Nzh6IiBmaWxsPSJ1cmwoI2xvYmUtaWNvbnMtZ2VtaW5pLTEtX1JfMF8pIj48L3BhdGg+PHBhdGggZD0iTTIwLjYxNiAxMC44MzVhMTQuMTQ3IDE0LjE0NyAwIDAxLTQuNDUtMy4wMDEgMTQuMTExIDE0LjExMSAwIDAxLTMuNjc4LTYuNDUyLjUwMy41MDMgMCAwMC0uOTc1IDAgMTQuMTM0IDE0LjEzNCAwIDAxLTMuNjc5IDYuNDUyIDE0LjE1NSAxNC4xNTUgMCAwMS00LjQ1IDMuMDAxYy0uNjUuMjgtMS4zMTguNTA1LTIuMDAyLjY3OGEuNTAyLjUwMiAwIDAwMCAuOTc1Yy42ODQuMTcyIDEuMzUuMzk3IDIuMDAyLjY3N2ExNC4xNDcgMTQuMTQ3IDAgMDE0LjQ1IDMuMDAxIDE0LjExMiAxNC4xMTIgMCAwMTMuNjc5IDYuNDUzLjUwMi41MDIgMCAwMC45NzUgMGMuMTcyLS42ODUuMzk3LTEuMzUxLjY3Ny0yLjAwM2ExNC4xNDUgMTQuMTQ1IDAgMDEzLjAwMS00LjQ1IDE0LjExMyAxNC4xMTMgMCAwMTYuNDUzLTMuNjc4LjUwMy41MDMgMCAwMDAtLjk3NSAxMy4yNDUgMTMuMjQ1IDAgMDEtMi4wMDMtLjY3OHoiIGZpbGw9InVybCgjbG9iZS1pY29ucy1nZW1pbmktMi1fUl8wXykiPjwvcGF0aD48ZGVmcz48bGluZWFyR3JhZGllbnQgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGlkPSJsb2JlLWljb25zLWdlbWluaS0wLV9SXzBfIiB4MT0iNyIgeDI9IjExIiB5MT0iMTUuNSIgeTI9IjEyIj48c3RvcCBzdG9wLWNvbG9yPSIjMDhCOTYyIj48L3N0b3A+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDhCOTYyIiBzdG9wLW9wYWNpdHk9IjAiPjwvc3RvcD48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgaWQ9ImxvYmUtaWNvbnMtZ2VtaW5pLTEtX1JfMF8iIHgxPSI4IiB4Mj0iMTEuNSIgeTE9IjUuNSIgeTI9IjExIj48c3RvcCBzdG9wLWNvbG9yPSIjRjk0NTQzIj48L3N0b3A+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjRjk0NTQzIiBzdG9wLW9wYWNpdHk9IjAiPjwvc3RvcD48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgaWQ9ImxvYmUtaWNvbnMtZ2VtaW5pLTItX1JfMF8iIHgxPSIzLjUiIHgyPSIxNy41IiB5MT0iMTMuNSIgeTI9IjEyIj48c3RvcCBzdG9wLWNvbG9yPSIjRkFCQzEyIj48L3N0b3A+PHN0b3Agb2Zmc2V0PSIuNDYiIHN0b3AtY29sb3I9IiNGQUJDMTIiIHN0b3Atb3BhY2l0eT0iMCI+PC9zdG9wPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==", "deepseek-color": "data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjFlbSIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkRlZXBTZWVrPC90aXRsZT48cGF0aCBkPSJNMjMuNzQ4IDQuNDgyYy0uMjU0LS4xMjQtLjM2NC4xMTMtLjUxMi4yMzQtLjA1MS4wMzktLjA5NC4wOS0uMTM3LjEzNi0uMzcyLjM5Ny0uODA2LjY1Ny0xLjM3My42MjYtLjgyOS0uMDQ2LTEuNTM3LjIxNC0yLjE2My44NDgtLjEzMy0uNzgyLS41NzUtMS4yNDgtMS4yNDctMS41NDgtLjM1Mi0uMTU2LS43MDgtLjMxMS0uOTU1LS42NS0uMTcyLS4yNDEtLjIxOS0uNTEtLjMwNS0uNzc0LS4wNTUtLjE2LS4xMS0uMzIzLS4yOTMtLjM1LS4yLS4wMzEtLjI3OC4xMzYtLjM1Ni4yNzYtLjMxMy41NzItLjQzNCAxLjIwMi0uNDIyIDEuODQuMDI3IDEuNDM2LjYzMyAyLjU4IDEuODM4IDMuMzkzLjEzNy4wOTMuMTcyLjE4Ny4xMjkuMzIzLS4wODIuMjgtLjE4LjU1Mi0uMjY2LjgzMy0uMDU1LjE3OS0uMTM3LjIxNy0uMzI5LjE0YTUuNTI2IDUuNTI2IDAgMDEtMS43MzYtMS4xOGMtLjg1Ny0uODI4LTEuNjMxLTEuNzQyLTIuNTk3LTIuNDU4YTExLjM2NSAxMS4zNjUgMCAwMC0uNjg5LS40NzFjLS45ODUtLjk1Ny4xMy0xLjc0My4zODgtMS44MzYuMjctLjA5OC4wOTMtLjQzMi0uNzc5LS40MjgtLjg3Mi4wMDQtMS42Ny4yOTUtMi42ODcuNjg0YTMuMDU1IDMuMDU1IDAgMDEtLjQ2NS4xMzcgOS41OTcgOS41OTcgMCAwMC0yLjg4My0uMTAyYy0xLjg4NS4yMS0zLjM5IDEuMTAyLTQuNDk3IDIuNjIzQy4wODIgOC42MDYtLjIzMSAxMC42ODQuMTUyIDEyLjg1Yy40MDMgMi4yODQgMS41NjkgNC4xNzUgMy4zNiA1LjY1MyAxLjg1OCAxLjUzMyAzLjk5NyAyLjI4NCA2LjQzOCAyLjE0IDEuNDgyLS4wODUgMy4xMzMtLjI4NCA0Ljk5NC0xLjg2LjQ3LjIzNC45NjIuMzI3IDEuNzguMzk3LjYzLjA1OSAxLjIzNi0uMDMgMS43MDUtLjEyOC43MzUtLjE1Ni42ODQtLjgzNy40MTktLjk2MS0yLjE1NS0xLjAwNC0xLjY4Mi0uNTk1LTIuMTEzLS45MjYgMS4wOTYtMS4yOTYgMi43NDYtMi42NDIgMy4zOTItNy4wMDMuMDUtLjM0Ny4wMDctLjU2NSAwLS44NDUtLjAwNC0uMTcuMDM1LS4yMzcuMjMtLjI1NmE0LjE3MyA0LjE3MyAwIDAwMS41NDUtLjQ3NWMxLjM5Ni0uNzYzIDEuOTYtMi4wMTUgMi4wOTMtMy41MTcuMDItLjIzLS4wMDQtLjQ2Ny0uMjQ3LS41ODh6TTExLjU4MSAxOGMtMi4wODktMS42NDItMy4xMDItMi4xODMtMy41Mi0yLjE2LS4zOTIuMDI0LS4zMjEuNDcxLS4yMzUuNzYzLjA5LjI4OC4yMDcuNDg2LjM3MS43MzkuMTE0LjE2Ny4xOTIuNDE2LS4xMTMuNjAzLS42NzMuNDE2LTEuODQyLS4xNC0xLjg5Ny0uMTY3LTEuMzYxLS44MDItMi41LTEuODYtMy4zMDEtMy4zMDctLjc3NC0xLjM5My0xLjIyNC0yLjg4Ny0xLjI5OC00LjQ4Mi0uMDItLjM4Ni4wOTMtLjUyMi40NzctLjU5MmE0LjY5NiA0LjY5NiAwIDAxMS41MjktLjAzOWMyLjEzMi4zMTIgMy45NDYgMS4yNjUgNS40NjggMi43NzQuODY4Ljg2IDEuNTI1IDEuODg3IDIuMjAyIDIuODkxLjcyIDEuMDY2IDEuNDk0IDIuMDgyIDIuNDggMi45MTQuMzQ4LjI5Mi42MjUuNTE0Ljg5MS42NzctLjgwMi4wOS0yLjE0LjExLTMuMDU0LS42MTR6bTEtNi40NGEuMzA2LjMwNiAwIDAxLjQxNS0uMjg3LjMwMi4zMDIgMCAwMS4yLjI4OC4zMDYuMzA2IDAgMDEtLjMxLjMwNy4zMDMuMzAzIDAgMDEtLjMwNC0uMzA4em0zLjExIDEuNTk2Yy0uMi4wODEtLjM5OS4xNTEtLjU5LjE2YTEuMjQ1IDEuMjQ1IDAgMDEtLjc5OC0uMjU0Yy0uMjc0LS4yMy0uNDctLjM1OC0uNTUyLS43NThhMS43MyAxLjczIDAgMDEuMDE2LS41ODhjLjA3LS4zMjctLjAwOC0uNTM3LS4yMzktLjcyNy0uMTg3LS4xNTYtLjQyNi0uMTk5LS42ODgtLjE5OWEuNTU5LjU1OSAwIDAxLS4yNTQtLjA3OGMtLjExLS4wNTQtLjItLjE5LS4xMTQtLjM1OC4wMjgtLjA1NC4xNi0uMTg2LjE5Mi0uMjEuMzU2LS4yMDIuNzY3LS4xMzYgMS4xNDYuMDE2LjM1Mi4xNDQuNjE4LjQwOCAxLjAwMS43ODIuMzkxLjQ1MS40NjIuNTc2LjY4NS45MTQuMTc2LjI2NS4zMzYuNTM3LjQ0NS44NDguMDY3LjE5NS0uMDE5LjM1NC0uMjUuNDUyeiIgZmlsbD0iIzRENkJGRSI+PC9wYXRoPjwvc3ZnPg==", "grok": "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZWVlYWY2IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGhlaWdodD0iMWVtIiBzdHlsZT0iZmxleDpub25lO2xpbmUtaGVpZ2h0OjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjFlbSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+R3JvazwvdGl0bGU+PHBhdGggZD0iTTkuMjcgMTUuMjlsNy45NzgtNS44OTdjLjM5MS0uMjkuOTUtLjE3NyAxLjEzNy4yNzIuOTggMi4zNjkuNTQyIDUuMjE1LTEuNDEgNy4xNjktMS45NTEgMS45NTQtNC42NjcgMi4zODItNy4xNDkgMS40MDZsLTIuNzExIDEuMjU3YzMuODg5IDIuNjYxIDguNjExIDIuMDAzIDExLjU2Mi0uOTUzIDIuMzQxLTIuMzQ0IDMuMDY2LTUuNTM5IDIuMzg4LTguNDJsLjAwNi4wMDdjLS45ODMtNC4yMzIuMjQyLTUuOTI0IDIuNzUtOS4zODMuMDYtLjA4Mi4xMi0uMTY0LjE3OS0uMjQ4bC0zLjMwMSAzLjMwNXYtLjAxTDkuMjY3IDE1LjI5Mk03LjYyMyAxNi43MjNjLTIuNzkyLTIuNjctMi4zMS02LjgwMS4wNzEtOS4xODQgMS43NjEtMS43NjMgNC42NDctMi40ODMgNy4xNjYtMS40MjVsMi43MDUtMS4yNWE3LjgwOCA3LjgwOCAwIDAwLTEuODI5LTFBOC45NzUgOC45NzUgMCAwMDUuOTg0IDUuODNjLTIuNTMzIDIuNTM2LTMuMzMgNi40MzYtMS45NjIgOS43NjQgMS4wMjIgMi40ODctLjY1MyA0LjI0Ni0yLjM0IDYuMDIyLS41OTkuNjMtMS4xOTkgMS4yNTktMS42ODIgMS45MjVsNy42Mi02LjgxNSI+PC9wYXRoPjwvc3ZnPg=="};
logoSources.ark='/assets/ark.svg';
const symbolHTML = (m) => `<span class="model-symbol" data-model="${m.name}" style="--color:${m.color}" aria-hidden="true"><img src="${logoSources[m.icon]}" alt=""></span>`;
const brandHTML = (m) => `<span class="model-name">${symbolHTML(m)}<span>${m.name}</span></span>`;
const mediaMotion = matchMedia('(prefers-reduced-motion:reduce)');
let motion = !mediaMotion.matches;
let current = '', generation = 0, busy = false, activeDetail = 0, results = [];
let preparing=false;
let requests = [], completed = 0, currentConversation = null, historyTimer = null;
let sentQuestionAnimation=null;
function cancelQuestionFade() {
  sentQuestionAnimation?.cancel(); sentQuestionAnimation=null;
}
function fadeSentQuestion(value) {
  cancelQuestionFade();
  const input=$('question');
  const animation=input.animate([{opacity:1},{opacity:0}],{
    delay:450,duration:motion&&!mediaMotion.matches?1200:0,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'
  });
  sentQuestionAnimation=animation;
  animation.finished.then(()=>{
    if(sentQuestionAnimation!==animation)return;
    if(input.value===value)input.value='';
    cancelQuestionFade();
  }).catch(()=>{});
}
$('question').addEventListener('beforeinput',cancelQuestionFade);
$('question').addEventListener('input',cancelQuestionFade);
function notice(message) {
  $('toast').textContent=message; $('toast').classList.add('visible');
  setTimeout(()=>$('toast').classList.remove('visible'),3000);
}
function setWaitingControl(waiting) {
 $('sendBtn').disabled=false;
 $('sendBtn').querySelector('.send-label').textContent=waiting?'停止等待':'发问';
 $('sendBtn').setAttribute('aria-label',waiting?'停止等待本轮回答':'发送问题');
}
function stopWaiting() {
 clearRun(true);
 results.forEach((result,index)=>{
   if(result.state==='pending')Object.assign(result,{state:'error',title:'已停止等待',error:'已停止接收这家平台的本轮回答。官网可能仍在生成；下一次提问前请确认官网已结束。',rendered:false});
   result.arrived=true;
   $('answers').children[index]?.classList.add('appeared');
   displayResult(index,generation);
 });
 notice('已停止等待，已收到的回答保留。');
}
function clearRun(preserve = false) {
  cancelQuestionFade();
  generation++; document.querySelectorAll('.answer-card.is-expanded').forEach(collapseAnswer); orbit.cancel(preserve);
  clearTimeout(historyTimer); historyTimer=null;
  requests.forEach(controller=>controller.abort()); requests=[];
  busy=false; setWaitingControl(false); document.body.classList.remove('sending');
}
function home() {
  clearRun(); document.body.classList.remove('results','preview-mode');
  ['universe','convergence','resultActions'].forEach(id=>$(id).hidden=true);
  $('question').value=''; $('progressText').textContent='';
  window.scrollTo({top:0,behavior:'instant'});
}
function openDialog(id) { $(id).showModal(); }
document.querySelectorAll('.close-dialog').forEach(button=>button.onclick=()=>button.closest('dialog').close());
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
}));
function mobileCardMotion(card,before) {
  if(!matchMedia('(max-width:740px)').matches)return;
  card.cardMotion?.cancel();
  if(!motion||mediaMotion.matches)return;
  const after=card.getBoundingClientRect();
  if(!after.width||!after.height)return;
  const dx=before.left+before.width/2-after.left-after.width/2;
  const dy=before.top+before.height/2-after.top-after.height/2;
  card.classList.add('is-morphing');
  const animation=card.animate([
    {transform:`translate3d(calc(-50% + ${dx}px),calc(-50% + ${dy}px),0) scale(${before.width/after.width},${before.height/after.height})`},
    {transform:'translate3d(-50%,-50%,0) scale(1,1)'}
  ],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
  card.cardMotion=animation;
  animation.finished.catch(()=>{}).finally(()=>{
    if(card.cardMotion!==animation)return;
    card.cardMotion=null;card.classList.remove('is-morphing');
  });
}
function collapseMobileAnswer(card) {
  if(!matchMedia('(max-width:740px)').matches||!motion||mediaMotion.matches)return false;
  if(card.classList.contains('is-collapsing'))return true;
  const before=card.getBoundingClientRect();
  card.cardMotion?.cancel();
  // Measure the destination once; keep the expanded surface throughout the motion.
  card.classList.remove('is-expanded');
  const target=card.getBoundingClientRect();
  card.classList.add('is-expanded','is-collapsing','is-morphing');
  const surface=card.getBoundingClientRect();
  const transformFor=rect=>`translate3d(calc(-50% + ${rect.left+rect.width/2-surface.left-surface.width/2}px),calc(-50% + ${rect.top+rect.height/2-surface.top-surface.height/2}px),0) scale(${rect.width/surface.width},${rect.height/surface.height})`;
  const animation=card.animate([{transform:transformFor(before)},{transform:transformFor(target)}],{
    duration:420,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'
  });
  card.cardMotion=animation;card.setAttribute('aria-expanded','false');
  animation.finished.then(()=>{
    if(card.cardMotion!==animation)return;
    card.classList.remove('is-expanded','is-collapsing','is-morphing');
    animation.cancel();card.cardMotion=null;
  }).catch(()=>{});
  return true;
}
function collapseAnswer(card) {
  if(!card.classList.contains('is-expanded'))return;
  if(collapseMobileAnswer(card))return;
  const before=card.getBoundingClientRect();
  card.cardMotion?.cancel();
  card.classList.add('is-collapsing');card.classList.remove('is-expanded');card.setAttribute('aria-expanded','false');
  mobileCardMotion(card,before);
  clearTimeout(card.collapseTimer);card.collapseTimer=setTimeout(()=>card.classList.remove('is-collapsing'),560);
}
function expandAnswer(card,index) {
  if(card.disabled||results[index]?.state!=='done'||card.classList.contains('is-expanded'))return;
  document.querySelectorAll('.answer-card.is-expanded').forEach(collapseAnswer);
  const before=card.getBoundingClientRect();
  card.cardMotion?.cancel();
  clearTimeout(card.collapseTimer);card.classList.remove('is-collapsing');
  const box=card.getBoundingClientRect(),area=$('answers').getBoundingClientRect();
  const mobile=matchMedia('(max-width:740px)').matches;
  const viewportTop=mobile?(window.visualViewport?.offsetTop||0):0;
  const viewportBottom=viewportTop+(mobile?(window.visualViewport?.height||innerHeight):innerHeight);
  let safeTop=viewportTop+14;
  if(mobile) {
    for(const element of document.querySelectorAll('.header,.account-nav')) {
      const rect=element.getBoundingClientRect();
      if(rect.height&&rect.bottom>viewportTop&&rect.top<viewportBottom)
        safeTop=Math.max(safeTop,rect.bottom+14);
    }
  }
  const width=Math.min(innerWidth-28,Math.max(box.width,520));
  const availableHeight=Math.max(80,viewportBottom-safeTop-14);
  const height=Math.min(availableHeight,Math.max(box.height,Math.min(560,availableHeight*.82)));
  const left=Math.max(14,Math.min(box.left-(width-box.width)/2,innerWidth-width-14));
  const top=Math.max(safeTop,Math.min(box.top-(height-box.height)/2,viewportBottom-height-14));
  card.style.setProperty('--expanded-left',(left+width/2-area.left)+'px');
  card.style.setProperty('--expanded-top',(top+height/2-area.top)+'px');
  card.style.setProperty('--expanded-width',width+'px');card.style.setProperty('--expanded-height',height+'px');
  card.querySelector('.inline-answer').textContent=results[index].text||'';
  card.querySelector('.inline-answer').scrollTop=0;
  card.setAttribute('aria-expanded','true');card.classList.add('is-expanded');
  mobileCardMotion(card,before);
}
function attachAnswerHover(card,index) {
  let timer;
  card.addEventListener('pointerenter',event=>{
    if(event.pointerType!=='mouse'||card.disabled||results[index]?.state!=='done')return;
    const run=generation;
    timer=setTimeout(()=>{if(run===generation&&card.isConnected&&card.matches(':hover'))expandAnswer(card,index);},180);
  });
  card.addEventListener('pointerleave',event=>{clearTimeout(timer);if(event.pointerType==='mouse')collapseAnswer(card);});
  card.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();collapseAnswer(card);}});
  card.addEventListener('blur',()=>collapseAnswer(card));
}
let answerViewportWidth=innerWidth;
window.addEventListener('resize',()=>{
  // Mobile browser chrome changes height while reading; keep the card open.
  if(innerWidth===answerViewportWidth&&matchMedia('(max-width:740px)').matches)return;
  answerViewportWidth=innerWidth;
  document.querySelectorAll('.answer-card.is-expanded').forEach(collapseAnswer);
});
function makeCards() {
  $('answers').replaceChildren();
  models.forEach((model,index)=>{
    const card=document.createElement('button'); card.className='answer-card'; card.disabled=true;
    card.dataset.slot=model.slot;
    card.style.setProperty('--color',model.color); card.setAttribute('aria-label','展开 '+model.name+' 的回答');
    card.innerHTML=`<div class="card-header">${brandHTML(model)}<span class="card-status loading">正在连接</span></div><h2></h2><p></p><div class="inline-answer"></div>`;
    card.setAttribute('aria-expanded','false');
    card.onclick=event=>{
      if(results[index]?.state==='done') {
        if(card.classList.contains('is-expanded')&&card.classList.contains('is-collapsing')) {
          const before=card.getBoundingClientRect();card.cardMotion?.cancel();
          card.classList.remove('is-collapsing');card.setAttribute('aria-expanded','true');
          mobileCardMotion(card,before);return;
        }
        if(card.classList.contains('is-expanded')) { if(event.detail===0||!matchMedia('(hover:hover)').matches)collapseAnswer(card); }
        else expandAnswer(card,index);
      } else showDetail(index);
    }; attachAnswerHover(card,index); $('answers').append(card);
  });
}
function displayResult(index, run) {
  if(run!==generation)return;
  const result=results[index],card=$('answers').children[index];
  if(!result.arrived||result.rendered)return;
  if(result.state==='pending') {
    card.classList.add('waiting');
    card.querySelector('h2').textContent=result.text?'正在接收网页回答…':'正在等待回答…';
    card.querySelector('p').textContent=result.text?.slice(0,200)||'模型正在处理你的问题';
    card.querySelector('.card-status').textContent=result.text?'网页生成中':'思考中';
    return;
  }
  result.rendered=true; card.classList.remove('waiting');
  card.classList.add('answer-ready'); card.disabled=false;
  const success=result.state==='done';
  card.classList.toggle('is-error',result.state==='error');
  card.querySelector('h2').textContent=success ? result.text.split('\n').find(line=>line.trim())?.replace(/^#+\s*/,'').split(/[。！？!?]/)[0].slice(0,32) || '查看回答' : result.title;
  card.querySelector('p').textContent=success ? result.text.slice(0,200) : result.error;
  card.querySelector('.card-status').classList.remove('loading');
  card.querySelector('.card-status').textContent=success?(result.transport==='web'?'网页回答':'已回答'):result.state==='unconnected'?'未连接':'暂未完成';
  completed++;
  $('progressText').textContent=`${completed} / ${models.length} 个平台已处理`;
  if(completed===models.length) {
    orbit.setIdle(true,motion&&!mediaMotion.matches);
    busy=false; setWaitingControl(false); document.body.classList.remove('sending');
    $('summaryText').textContent=document.body.classList.contains('preview-mode')?'这是动效预览。登录并连接 AI 后，这些卡片将展示真实回答。':`本次收到 ${results.filter(item=>item.state==='done').length} 家平台的回答。点开卡片查看完整内容。${results.some(item=>item.transport==='web')?' 网页测试回答仅保留在当前页面。':''}`;
    $('convergence').hidden=false; $('resultActions').hidden=false;
  }
}
async function fetchAnswer(index,run,requestId) {
  const controller=new AbortController(); requests.push(controller);
  try {
    const response=results[index].transport==='web'?await webConnection.ask(models[index].name,current,controller.signal,text=>{if(run!==generation)return;results[index].text=text;displayResult(index,run);}):await account.api('/ask',{method:'POST',body:JSON.stringify({provider:models[index].name,question:current,requestId,conversationId:currentConversation}),signal:controller.signal});
    if(run!==generation)return;
    Object.assign(results[index],{state:'done',text:response.text,model:response.model});
  } catch(error) {
    if(run!==generation||error.name==='AbortError')return;
    Object.assign(results[index],{state:'error',title:/额度已用完/.test(error.message)?'额度已用完':'这次回答未完成',error:error.message});
  }
  displayResult(index,run);
  if(run===generation&&$('detailDialog').open&&activeDetail===index)renderDetail();
}
async function ask(question, preview = false) {
  const value=question.trim(); if(!value||busy||preparing)return;
  if(!preview&&webConnection.enabled){preparing=true;try{await webConnection.prepare();}catch(error){notice(error.message);webConnection.open();return;}finally{preparing=false;}}
  if(!preview&&!webConnection.enabled&&!account.user){account.guestAllowed?account.openConnections():account.openAuth();return;}
  if(!preview&&!webConnection.enabled&&!account.connections.length){notice('先连接至少一家 AI，再开始提问。');account.openConnections();return;}
  const preserve=document.body.classList.contains('results')&&$('answers').children.length===models.length;
  clearRun(preserve); busy=true; current=value; completed=0;
  const run=generation,requestId=crypto.randomUUID();
  currentConversation=preview?null:requestId;
  $('question').value=value; setWaitingControl(true); fadeSentQuestion(value);
  document.body.classList.add('results','sending'); document.body.classList.toggle('preview-mode',preview); $('universe').hidden=false;
  ['convergence','resultActions'].forEach(id=>$(id).hidden=true);
  results=models.map(model=>!preview&&(webConnection.enabled?webConnection.canAsk(model.name):account.connections.some(item=>item.provider===model.name))
    ? {state:'pending',text:'',arrived:false,transport:webConnection.enabled?'web':'api'}
    : {state:'unconnected',title:model.apiOnly?'通过 API 连接':webConnection.enabled?'本次未选择此官网':'连接后即可回答',error:model.apiOnly?'在「连接 AI」中填写火山方舟 API Key 和 Model ID，再切换到 API 模式提问。':webConnection.enabled?'在网页模式中勾选并连接此平台，或切回 API 模式使用已连接的密钥。':'在「连接 AI」中添加 '+model.name+' 的 API Key。',arrived:false});
  if(preserve) {
    Array.from($('answers').children).forEach((card,index)=>{
      card.disabled=true; card.classList.remove('is-error'); card.classList.add('waiting');
      card.querySelector('.card-status').textContent='正在传递';
      card.querySelector('h2').textContent=results[index].state==='pending'?'正在等待新回答…':results[index].title;
      card.querySelector('p').textContent=results[index].state==='pending'?'模型正在处理你的新问题':results[index].error;
    });
  } else makeCards();
  orbit.send(models,motion&&!mediaMotion.matches,index=>{
    if(run!==generation)return;
    results[index].arrived=true; displayResult(index,run);
  },preserve);
  results.forEach((result,index)=>{if(result.state==='pending')fetchAnswer(index,run,requestId);});
}
$('askForm').onsubmit=event=>{
  event.preventDefault(); if(busy){stopWaiting();return;} if(!$('question').value.trim()){notice('先输入一个问题。');return;} ask($('question').value);
};
$('question').onkeydown=event=>{
  if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('askForm').requestSubmit();}
};
$('home').onclick=home; $('newBtn').onclick=()=>{home();$('question').focus();};
$('againBtn').onclick=()=>ask(current,document.body.classList.contains('preview-mode'));
$('previewButton').onclick=()=>ask($('question').value.trim()||'从一个问题，看看六种视角',true);
function renderDetail() {
  const model=models[activeDetail],result=results[activeDetail];
  $('detailBrand').innerHTML=brandHTML(model); $('detailQuestion').textContent=current;
  $('detailTitle').textContent=result.state==='done' ? result.model : result.state==='pending'?'正在等待回答…':result.title;
  $('detailBody').replaceChildren();
  const text=document.createElement('div'); text.className='detail-response'; text.textContent=result.state==='pending'?'模型正在处理你的问题，完成后会自动显示。':result.text||result.error;
  $('detailBody').append(text); $('detailIndex').textContent=`${activeDetail+1} / ${models.length}`;
  $('copyBtn').textContent='复制内容';
  $('copyBtn').disabled=result.state!=='done';
  $('retryAnswer').hidden=result.state!=='error'||document.body.classList.contains('preview-mode');
  $('retryNote').hidden=$('retryAnswer').hidden;
  $('retryNote').textContent=result.transport==='web'?'重试会再次向对应官网发送问题，使用官网额度。':'只重新调用当前平台，会使用该平台的 API 额度。';
  $('detailDialog').querySelector('.detail-scroll').scrollTop=0;
}
function showDetail(index) {
  if(results[index].state==='unconnected'&&webConnection.enabled&&!models[index].apiOnly){webConnection.open();return;}
  if(results[index].state==='unconnected'){models[index].webOnly?webConnection.open():account.openConnections(models[index].name);return;}
  activeDetail=index; renderDetail();
  $('detailDialog').style.setProperty('--answer-accent',models[index].color);
  const card=$('answers').children[index],box=card?.getBoundingClientRect();
  $('detailDialog').style.setProperty('--answer-origin',box?`${Math.round((box.x+box.width/2)/innerWidth*100)}% ${Math.round((box.y+box.height/2)/innerHeight*100)}%`:'50% 50%');
  openDialog('detailDialog');
}
function changeDetail(delta) {
  activeDetail=(activeDetail+delta+models.length)%models.length;
  $('detailDialog').style.setProperty('--answer-accent',models[activeDetail].color);
  renderDetail();
}
$('prevAnswer').onclick=()=>changeDetail(-1); $('nextAnswer').onclick=()=>changeDetail(1);
$('detailDialog').onkeydown=event=>{
  if(event.key==='ArrowRight'){event.preventDefault();changeDetail(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();changeDetail(-1);}
};
$('copyBtn').onclick=async()=>{
  try { await navigator.clipboard.writeText(`${models[activeDetail].name}\n问题：${current}\n\n${results[activeDetail].text||results[activeDetail].error}`);$('copyBtn').textContent='已复制'; }
  catch { $('copyBtn').textContent='请选中文字复制'; }
};
$('retryAnswer').onclick=()=>{
  const index=activeDetail;
  if(results[index].state!=='error'||!currentConversation)return;
  if(results[index].transport!=='web'&&!account.connections.some(c=>c.provider===models[index].name)){models[index].webOnly?webConnection.open():account.openConnections(models[index].name);return;}
  completed=Math.max(0,completed-1); busy=true; setWaitingControl(true);
  results[index]={state:'pending',text:'',arrived:true,rendered:false,transport:results[index].transport};
  $('answers').children[index].classList.remove('is-error','answer-ready');
  displayResult(index,generation);renderDetail();
  fetchAnswer(index,generation,crypto.randomUUID());
};
$('aboutBtn').onclick=()=>openDialog('infoDialog');
$('demoBtn').onclick=()=>account.openTutorial();
$('joinBtn').onclick=()=>account.openConnections();
$('historyBtn').onclick=$('recordsButton').onclick=async()=>{
  if(!account.user){account.guestAllowed?account.openConnections():account.openAuth();return;}
  if(busy){notice('回答还在生成，完成后可以查看历史记录。');return;}
  $('historyList').replaceChildren();
  const loading=document.createElement('p');loading.textContent='正在读取历史回答…';$('historyList').append(loading);
  openDialog('historyDialog');
  const owner=account.user.id;
  try {
    const {conversations}=await account.api('/history');
    if(account.user?.id!==owner)return;
    $('historyList').replaceChildren();
    if(!conversations.length){loading.textContent='还没有保存的提问。连接一家 AI 后，就可以开始。';$('historyList').append(loading);}
    for(const item of conversations) {
      const button=document.createElement('button'),title=document.createElement('span'),meta=document.createElement('small');
      title.textContent=item.question;meta.textContent=`${new Date(item.created_at).toLocaleString()} · ${item.answer_count} 家已回答`;
      button.append(title,meta);button.onclick=()=>openSavedConversation(item.id);$('historyList').append(button);
    }
  } catch(error){loading.textContent=error.message;}
};
async function openSavedConversation(id, refresh=false) {
  const run=generation;
  try {
    const data=await account.api('/history/'+encodeURIComponent(id));
    if(run!==generation)return;
    if(!refresh)clearRun();
    current=data.question;currentConversation=data.id;completed=0;
    $('question').value=current;$('historyDialog').close();
    document.body.classList.add('results');document.body.classList.remove('preview-mode','sending');
    $('universe').hidden=false;['convergence','resultActions'].forEach(key=>$(key).hidden=true);
    results=models.map(model=>({...data.answers.find(answer=>answer.provider===model.name)||{state:'unconnected',title:'本次未调用',error:'这次提问没有调用该平台。'},arrived:false,rendered:false}));
    busy=results.some(result=>result.state==='pending');$('sendBtn').disabled=busy;
    makeCards();const savedRun=generation;
    orbit.send(models,false,index=>{results[index].arrived=true;displayResult(index,savedRun);});
    if($('detailDialog').open)renderDetail();
    if(busy)historyTimer=setTimeout(()=>openSavedConversation(id,true),3000);
    if(!refresh)window.scrollTo({top:0,behavior:'instant'});
  } catch(error){notice(error.message);if(refresh){busy=false;$('sendBtn').disabled=false;}}
}
$('compareBtn').onclick=()=>{
  $('compareList').replaceChildren();
  models.forEach((model,index)=>{
    const article=document.createElement('article'),brand=document.createElement('div'),content=document.createElement('div'),p=document.createElement('p');
    brand.innerHTML=brandHTML(model);p.className='detail-response';p.textContent=results[index].text||results[index].error;
    content.append(p);article.append(brand,content);$('compareList').append(article);
  });
  openDialog('compareDialog');
};
function updateMotion() {
  orbit.setIdle(!busy&&results.length>0&&document.body.classList.contains('results'),motion&&!mediaMotion.matches);
  document.documentElement.classList.toggle('reduced',!motion);
  $('motionBtn').setAttribute('aria-pressed',String(motion));$('motionBtn').querySelector('span').textContent=motion?'开':'关';
}
$('motionBtn').onclick=()=>{motion=!motion;updateMotion();};
mediaMotion.onchange=()=>{motion=!mediaMotion.matches;updateMotion();};updateMotion();
account.init(models,brandHTML,()=>{if(!account.user&&!webConnection.enabled){home();currentConversation=null;results=[];for(const id of ['historyDialog','detailDialog','compareDialog'])$(id).close();}});
