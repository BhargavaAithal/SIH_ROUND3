# ADR-0012: Raster-to-Graph Topology Reconstruction & Spatial Engine Architecture (SMITRACE ADR-005)

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: SMITRACE Architecture Team
- **Tags**: #vision #raster #topology #skeletonization #kdtree #ocr #isa51 #networkx

## Context & Problem Statement
Engineering schematics (P&IDs, isometric drawings) are massive raster or scanned vector documents (4000x3000 to 8000x6000 pixels). Extracting topological connectivity—process pipes, control valves, pumps, instrument loops, and line tags—requires sub-second processing, high junction preservation, and robust handling of scanned paper artifacts such as broken lines, dust, and non-uniform contrast.

Standard multimodal vision models fail on these documents when downsampled into fixed 14x14 patch tokens, losing small valves, line connectivity, and alphanumeric tags.

## Decision Drivers
- **Junction Preservation**: Pipe tees, crossings, and terminations must be classified accurately using topological invariants.
- **Artifact Resilience**: Disconnected lines caused by scanner noise or low resolution must be bridged before skeletonization.
- **Spatial Association**: Floating equipment symbols and text tags must snap to their associated process lines with sub-pixel precision.
- **Graph Queryability**: The resulting topology must support shortest-path calculations, valve isolation tracing, and fluid flow directionality.

## Considered Options
1. **Skeletonization Engines**:
   - **OpenCV Guo-Hall Thinning (`cv2.ximgproc.thinning`)**: Fast CPU execution (21.3ms), 99.1% junction fidelity, 1.2% spurious branch rate.
   - **Pure NumPy Vectorized Zhang-Suen (`skeletonizer.py`)**: Zero-dependency portable fallback; evaluates Rutovitz Crossing Number invariant.
   - **GPU CUDA Morphology**: Ultra-high throughput, but introduces PCIe transfer overhead for individual image tiles.
2. **Spatial Indexing & Geometric Snapping**:
   - **SciPy `cKDTree`**: Fast $O(\log N)$ nearest-neighbor queries; orthogonal projection snapping to polyline vectors.
   - **Rust `rstar` (R*-Tree)**: Excellent spatial bounding box performance; target for production Rust engine migration.
3. **Graph Topology Models**:
   - **NetworkX**: Rich Python graph algorithms (`nx.Graph` undirected physical topology, `nx.DiGraph` directed process flow).
   - **Rust `petgraph`**: 100x faster graph traversals across 50,000+ nodes; planned production target.
4. **OCR & Symbol Recognition**:
   - **PaddleOCR ONNX v4**: Lightweight ONNX runtime (<1.2GB VRAM), sub-15ms inference, robust alphanumeric extraction.
   - **Tesseract 5**: Slower execution on dense engineering fonts; higher character substitution error rates.

## Decision Outcome
Chosen Option: **OpenCV Guo-Hall Thinning** with pure NumPy Zhang-Suen fallback, coupled with **Pre-Thinning Directional Gap-Bridging**, **Sliding-Window Tiling**, **cKDTree 40px Snapping**, and **PaddleOCR ONNX v4 with ISA-5.1 Regex Repair**.

### Implementation Architecture
1. **Sliding-Window Tiling & Boundary Shifting (`patcher.py`)**:
   - Slices 4000x3000 schematics into uniform 1024x1024 tiles with 256px overlap.
   - Applies boundary stride-shifting (`edge_mode="shift"`) to eliminate edge clipping, with cross-patch IoU Non-Maximum Suppression (NMS) deduplicating symbols.
2. **Pre-Skeletonization Gap-Bridging (`skeletonizer.py`)**:
   - Directional morphological closing kernels ($1 \times 7$ horizontal, $7 \times 1$ vertical) to bridge broken lines without blurring parallel pipes.
   - Progressive Probabilistic Hough Transform (`cv2.HoughLinesP`) to reconnect collinear line breaks and dashed instrumentation lines.
3. **Vectorized Morphological Thinning (`skeletonizer.py`)**:
   - Evaluates the Rutovitz Crossing Number invariant ($CN=1$ endpoint, $CN=2$ line, $CN \ge 3$ junction), 8-connected junction centroid clustering, and Ramer-Douglas-Peucker (RDP) polyline simplification.
4. **Spatial KD-Tree Snapping (`graph_builder.py`)**:
   - Spatial `cKDTree` index enforcing a **strict 40px snapping radius** with orthogonal projection to pipe polyline vectors.
5. **OCR & ISA-5.1 Regex Tag Repair**:
   - PaddleOCR ONNX v4 extracts text blocks; deterministic regex state machine (`repair_ocr_tag`) corrects common OCR character confusions (`0` $\leftrightarrow$ `O`, `1` $\leftrightarrow$ `I`, `S` $\leftrightarrow$ `5`) against ISA-5.1 standards.

### Positive Consequences
- P&IDs are converted into queryable, mathematically verifiable graph models in sub-second runtimes.
- Scanning artifacts and broken lines are bridged automatically before topology generation.
- High memory efficiency through patch-based streaming, eliminating GPU VRAM bloat.

### Negative Consequences / Tradeoffs
- Extremely degraded, hand-annotated historical blueprints may require manual operator snapping adjustments.
- Maintaining dual NetworkX and future `petgraph` implementations requires schema synchronization.

## Invariants & Compliance Rules
1. **Pre-Thinning Gap Invariant**: Gap-bridging heuristics must execute strictly prior to skeletonization; attempting to thin unbridged rasters is prohibited.
2. **Snapping Radius Invariant**: Symbol-to-line snapping must strictly enforce $r_{\text{snap}} \le 40\text{px}$; symbols beyond this threshold must remain unattached floating entities to prevent false topological edges.
3. **Dual-Graph Topology Invariant**: Extracted schematics must be represented in both undirected physical connectivity (`nx.Graph`) and directed operational flow (`nx.DiGraph`) models.
