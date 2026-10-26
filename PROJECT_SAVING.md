# Project saving · 2.2.3

Open Settings → Files / Export → Project Saving (or use the Save command).

- **Save Now / Ctrl+S** updates the current named project in this browser on this device. It does not ask for a name or create another download each time. Change Project name to rename this same saved entry.
- **Auto save** is enabled each time the app opens. Edits are saved after about 1.8 seconds of idle time; active strokes and processing finish first. A 30-second check retries pending changes. Moving to another app/tab and pagehide also attempt a recovery save. Automatic saves never open file dialogs or trigger downloads.
- On reopening, **Restore last project** resumes the saved project and keeps its save identity. **Start fresh** creates a separate project and leaves existing saves available. Choose any existing entry under Saved projects → Open saved project.
- **Save a copy** asks for a new name and creates a separate project. Subsequent Save Now clicks update the copy.
- **Download project file** exports a portable editable .p3sculpt backup using the current project name. Browser downloads may add a numbered suffix if a file already exists.
- **Choose file for Save Now…**, when offered by the browser, chooses a file once. Later explicit Save Now clicks write to that same file. Browser permission may need renewal. Auto save always stores the device copy; it does not silently overwrite your external file. The file handle is retained with the saved project when supported.
- **Open file** imports existing .p3sculpt files, including older files. It creates a device save for the imported document. Importing does not grant permission to overwrite its source file; use Choose file for Save Now if available.

## Recovery and limits

Saves use the existing native editable project format (mesh geometry, paint, transforms, materials, armatures/animation, selection, background and movie preferences). This change does not expand the native format to include custom scene lights, camera state or undo history. Those existing native-format limitations also apply to recovery saves.

Device saves belong to the current website, browser and device. They do not sync to another device. Private browsing, clearing site data, storage eviction or uninstalling browser data can remove them. Keep downloaded backups of important work. A sudden shutdown may interrupt the latest write; no browser can guarantee a final save after power is lost.

The project and its listing are committed in one IndexedDB transaction. A failed write keeps the prior committed copy. Failed saves show a visible status and unsaved changes retain the browser's exit warning. An offered previous save is never replaced by the startup sphere: restore it or explicitly start fresh. Fresh tabs receive independent project IDs. The database uses a V2 and deployment-path-specific name; V1 storage is unchanged.

## Validation

`python tests/saving.py` exercises automatic save, repeated Save Now preserving one ID without dialogs/downloads, rename, reload recovery, separate copies, portable download/import, real cloneable file-handle overwriting using an automated picker, visibility-change saving, storage-failure preservation and tab isolation. `P3_PHONE_VIEWPORT=1 python tests/saving.py` repeats at 390 × 844. Browser tests use Chromium and software rendering; real Safari, Pencil hardware and abrupt device power loss are not simulated.
