@echo off
cd /d "C:\Users\basil\OneDrive\Documents\GitHub Projects\PauseLoop"
set CI=1
node node_modules\expo\bin\cli export --platform web --output-dir dist
