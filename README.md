# HomeAi

Describe a house in plain English and get back a real, buildable floor plan in
about twenty seconds. Not a sketch and not a mood board. Actual room rectangles
that tile without overlapping, doors that connect rooms you can genuinely walk
between, windows that sit on real exterior walls, wiring and plumbing routed
through the house, and a ten page engineering PDF you can hand to a contractor.

**Live app:** https://sanky.space

```
"4 BHK duplex villa with a gym and a swimming pool"
        |
        v
  a two storey house, 15 rooms across both floors, every bedroom reachable,
  staircase aligned between levels, pool placed as a site feature,
  electrical and plumbing schedules, printable drawings
```

## The problem

Getting a floor plan drawn in India costs somewhere between 15,000 and 50,000
rupees and takes a week or more of back and forth with a draughtsman. If you
want to see what a third bedroom does to your budget, that is another round
trip. Most people building their first home never get to explore options at
all. They accept the first plan they are shown because iterating is expensive.

The tools that exist are either CAD packages that assume you already know
architecture, or AI image generators that produce a pretty picture of a house
that could never be built. Nothing sits in the middle: something that takes an
ordinary sentence and returns geometry an engineer would accept.

## What HomeAi actually does

You type a sentence. A language model turns it into an architectural program:
which rooms, how many, which floor each belongs on, what connects to what, and
what the local building conventions imply. That program then goes to a
constraint solver, not to an image model.

The solver places rooms as rectangles under hard constraints. Every room stays
inside the buildable envelope. No two rooms overlap. Every room that needs a
door shares at least three feet of wall with the space it opens onto. Bathrooms
do not become corridors. Bedrooms do not become hallways. Circulation is real,
not implied.

That distinction is the whole point. An image model can draw a house. It cannot
promise you that the master bedroom has a door.

## How it is built

**Language to program.** A single entry point in `llm_pool.py` handles every
model call. It holds a pool of API keys and rotates through them on quota or
5xx errors, parks a failing key on a cooldown, and caches identical requests so
a retry does not pay twice. Model output is schema constrained, so what comes
back is a typed architectural contract rather than prose to be parsed.

**Program to topology.** `topology_generator.py` proposes several structurally
different access graphs for the same room list: a compact hub, a linear spine,
split public and private branches. `topology_optimizer.py` ranks them on
circulation cost, privacy, zoning and daylight before any coordinates exist.

**Topology to geometry.** `geometry_engine.py` encodes the winning graph as a
CP SAT model with OR Tools. Room dimensions, non overlap, shared wall lengths
for every required door, forbidden adjacencies and compass constraints all
become hard or soft constraints. The solver returns exact coordinates on a
quarter foot grid.

**Geometry to a house.** `layout_engine.py` derives finite wall segments from
the solved rectangles, fits doors and windows to the wall segment each one
actually belongs to, and places furniture. `mep_generator.py` routes electrical
circuits from a distribution board through per room switchboards, and plumbing
from source through tank and manifold to every fixture.

**Validation gates.** `final_validator.py` and `geometry_validator.py` refuse
layouts where a room is unreachable, where a private space is the only route to
another room, or where any dimension falls below a usable minimum. A layout that
fails is discarded and another topology is tried. Nothing invalid reaches you.

**Everything is open vocabulary.** There is no fixed list of room names. Ask for
a pottery workshop, a recording studio, a wine cellar or a pet grooming room and
you get that room, sized sensibly for what it is, because unknown room types get
their minimum dimensions inferred and cached rather than falling back to a
generic default.

## Stack

Python, FastAPI, Google OR Tools CP SAT, Gemini, spaCy, Pillow on the backend.
React, Three.js via react three fiber, Zustand, Tailwind and react pdf on the
front end. Deployed behind nginx on Ubuntu.

## Running it locally

```bash
pip install -r requirements.txt
npm install

# One or more Gemini keys, comma separated. The pool rotates through them.
echo "GEMINI_API_KEYS=your_key_here" > .env

python -m uvicorn server:app --host 127.0.0.1 --port 8000
npm run dev
```

Open http://127.0.0.1:5173. The front end talks to the backend on port 8000 in
development and to a same origin `/api` in production.

Redis and Celery are supported for queued generation but are not required. When
no queue is reachable the API runs the pipeline in process and streams progress
over server sent events exactly the same way.

## Repository layout

| Path | What lives there |
| --- | --- |
| `server.py` | FastAPI app, generation pipeline, streaming endpoints |
| `llm_pool.py` | Key rotation, retries, response cache, schema constrained calls |
| `cloud_extractor.py` | Prompt to architectural program, room sizing, topology wiring |
| `intent_compiler.py` | Typed spatial constraints from language |
| `topology_generator.py` / `topology_optimizer.py` | Access graph candidates and ranking |
| `geometry_engine.py` | CP SAT room placement |
| `layout_engine.py` | Walls, doors, windows, furniture, fallback layout |
| `mep_generator.py` | Electrical and plumbing routing |
| `final_validator.py` / `geometry_validator.py` | Hard validation gates |
| `cost_engine.py` | Material and cost estimation |
| `src/` | React front end and the 3D viewer |
| `src/pdf/ArchitectReport.jsx` | The ten page engineering export |

## A note on the training CSVs

`train_indian_physics_bitmlp.py` trains an optional cost and safety predictor.
Its two source CSVs are around 146 MB together and are deliberately not in this
repository. The application does not load them at runtime and runs perfectly
without the trained model, simply skipping the physics prediction.

## Licence

MIT. See `LICENSE`.
