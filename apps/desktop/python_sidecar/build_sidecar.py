"""Builds dist/removebg-sidecar (PyInstaller one-folder) for the Electron bundle.

    .venv/Scripts/python -m pip install pyinstaller
    .venv/Scripts/python build_sidecar.py

Models are not bundled; they download on first launch into the app's user-data folder.
"""

import PyInstaller.__main__

PyInstaller.__main__.run(
    [
        "sidecar_server.py",
        "--name=removebg-sidecar",
        "--onedir",
        "--noconfirm",
        "--clean",
        "--console",
        "--collect-all=rembg",
        "--collect-all=onnxruntime",
        "--collect-all=pymatting",
        "--collect-submodules=uvicorn",
        "--hidden-import=model_loader",
        "--hidden-import=pipeline",
    ]
)
