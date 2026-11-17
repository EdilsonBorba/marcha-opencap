# Marcha OpenCap

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24289782.svg)](https://doi.org/10.5281/zenodo.24289782)

**English** · [Português](README.pt-BR.md)

A tool to analyze **walking and running** from [OpenCap](https://www.opencap.ai) data, in English or Portuguese (button at the top of the page).

**Open:** https://edilsonborba.github.io/marcha-opencap/

Everything runs in the browser: patient files are **never uploaded** to any server.

## What it does
1. Reads the **ZIP** downloaded from OpenCap, the unzipped **folder** (no size limit), loads directly from your **OpenCap account** (login), or opens a **public session** from its link or ID, no login needed.
2. Detects **TD** (*touchdown*: the foot touches the ground) and **TO** (*toe-off*: the toes leave the ground) events, which you **check and edit** on the video and on the 3D skeleton.
3. **Low-pass filter** for all data (zero-lag 4th-order Butterworth; automatic 6 Hz walking / 10 Hz running, editable, or off).
4. Detects the **steady window** (removes treadmill acceleration and overground start/end).
5. **Treadmill (with incline) or overground.** On the treadmill, lengths come from the entered belt speed.
6. **Running:** foot strike angle at TD and pattern (rearfoot / midfoot / forefoot; Altman & Davis, 2012).
7. Computes speed, cadence, step and stride length, step width, stance, swing, double support or flight time, **right–left symmetry** and **variability (CV)**.
8. Curves for hip, knee, ankle, pelvis, trunk and **center of mass in 3 axes** (mean ± SD, 0–100 % of the cycle), with direction arrows on the axis.
9. **Normative band** from the literature (healthy adults), chosen by speed and age group.
10. Shows the **OpenSim model skeleton in 3D** next to the video (forward kinematics of the `.osim` with the `.mot` angles; validated: model markers within ~2 cm of OpenCap's) and computes the **center of mass** from the segment masses of the scaled model.
11. Participant data (sex, age, height, mass) come from OpenCap and can be corrected.
12. Warns when tracking looks poor (regularity index).
13. **Compares** trials or sessions (before × after, conditions), as many as you like.
14. Generates a **PDF report** (with an automatic **findings** box: asymmetries ≥ 10 %, variability, tracking quality) and an **Excel** file with all data.
15. **Saves the analysis** to a `.json` file (marks, settings and results). To compare later, just open the file, even without the ZIP; with the ZIP, everything becomes editable again.

## Privacy: what stays on your computer
- **ZIP or folder:** read straight from your disk, in the tab's memory only.
- **OpenCap account or public session (API):** each file (.mot, .trc, videos, model) is fetched directly from OpenCap when you open the trial and is kept **only in the tab's memory**: nothing is written to disk and nothing goes through any other server. Close or reload the tab and it is gone.
- **Login:** the password goes straight to OpenCap and is not stored; the access *token* is kept in the tab's `sessionStorage` and erased when the tab closes (or when you sign out).
- **Stored in the browser:** only display preferences and language (`localStorage`); no patient data.
- **Cache:** as with any website, the browser may keep temporary copies (especially videos). On a shared computer, use a private window or clear the cache.
- **Saved only when you ask:** PDF report, Excel and `.json` analysis (to Downloads). The `.json` contains the patient's name: keep it safe.

## About the events (TD and TO)
Detection is automatic and you choose the method:
- **Walking:** foot position relative to the sacrum (Zeni et al., 2008).
- **Running:** vertical heel and mid-toe acceleration + toe height (Patoz et al., 2021).
- **Also available:** vertical foot velocity (Leitch et al., 2011).

Foot height is measured relative to the treadmill/floor plane (works on an inclined treadmill). All events can be **edited**: drag, move frame by frame, delete, mark by hand, or clear everything and mark from scratch.

## Normative band
Public data (CC BY 4.0) from Fukuchi et al.: walking (2018; young and older adults, 0.45 to 2 m/s) and running (2017; 2.5, 3.5 and 4.5 m/s). Hip and knee flexion, ankle dorsiflexion and hip adduction. These are marker-based laboratory data: differences of a few degrees from OpenCap are expected. `dados/normas.json` is built by `ferramentas/normas.py`.

## OpenCap files used
- `OpenSimData/Kinematics/*.mot`: joint angles
- `MarkerData/*.trc`: markers (events, lengths, width)
- `Videos/Cam*/InputMedia/<trial>/<trial>_sync.mp4`: video to check the events
- `OpenSimData/Model/*.osim` and `Geometry/*.vtp`: 3D skeleton and center of mass (without local meshes, they come from OpenCap's public repository)
- `sessionMetadata.yaml`: height, mass and sex (the field with the participant's name is not read)

Values are video-based estimates (OpenCap) and must be interpreted with clinical judgment.

## Run on your computer (optional)
Not needed: just open the link above. To use a local copy (e.g., to modify the code):

1. Get the code: green **Code → Download ZIP** button on this page (and unzip it), or in a terminal:
   ```
   git clone https://github.com/EdilsonBorba/marcha-opencap.git
   ```
2. Go into the folder and start a local server (Python comes with macOS):
   ```
   cd marcha-opencap
   python3 -m http.server 8000
   ```
3. Open **http://localhost:8000** in Chrome or Edge.

Double-clicking `index.html` does not work: browsers block JavaScript modules outside a server. Libraries (charts, PDF, Excel, 3D) are downloaded from the internet when the page opens.

## How to cite
Borba, E. F. de. *Marcha OpenCap: gait and running analysis from OpenCap data* [software]. Zenodo. https://doi.org/10.5281/zenodo.24289782

## References
- Zeni JA, Richards JG, Higginson JS (2008). Two simple methods for determining gait events during treadmill and overground walking using kinematic data. *Gait & Posture* 27:710–714.
- Patoz A, Lussiana T, Gindre C, Malatesta D (2021). A novel kinematic detection of foot-strike and toe-off events during noninstrumented treadmill running to estimate contact time. *J Biomech* 128:110737.
- Altman AR, Davis IS (2012). A kinematic method for footstrike pattern detection in barefoot and shod runners. *Gait & Posture* 35:298–300.
- Leitch J et al. (2011). Identifying gait events without a force plate during running: a comparison of methods. *Gait & Posture* 33:130–132.
- Fukuchi RK, Fukuchi CA, Duarte M (2017). A public dataset of running biomechanics and the effects of running speed on lower extremity kinematics and kinetics. *PeerJ* 5:e3298.
- Fukuchi CA, Fukuchi RK, Duarte M (2018). A public dataset of overground and treadmill walking kinematics and kinetics in healthy individuals. *PeerJ* 6:e4640.
- Uhlrich SD et al. (2023). OpenCap: human movement dynamics from smartphone videos. *PLOS Comput Biol* 19:e1011462.

## Support the project
This tool is free and open. If it helps your work, you can buy me a coffee:
- **Ko-fi** (card or PayPal, any country): https://ko-fi.com/edilsonborba
- **Pix** (Brazil, random key): `2a5b4d70-dbe4-458a-aa2f-dfa7e6e75549`

There is also a **"Buy me a coffee"** button in the site footer.

## Author
Edilson Fernando de Borba · [Lattes](http://lattes.cnpq.br/8263176199605135) · [ORCID](https://orcid.org/0000-0002-9399-1098) · borba.edi@gmail.com
