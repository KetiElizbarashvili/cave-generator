<template lang="pug">
#app
	#ui(:class="{ generated: generated }")
		span Actions:
		button#generate(:disabled="iterating", @click="initGrid") generate
		input#caveMode(
			type="checkbox",
			v-model="caveMode",
			:disabled="iterating",
			title="generation mode"
		)
		label(for="caveMode") {{ caveMode ? 'caves' : 'islands' }}
		input#classicGen(
			type="checkbox",
			v-model="classicMode",
			:disabled="iterating",
			title="generation mode"
		)
		label(for="classicGen") {{ classicMode ? 'classic' : 'weird' }}
		input#coloredBlocks(
			type="checkbox",
			v-model="coloredBlocks",
			:disabled="iterating",
			title="generation mode"
		)
		label(for="coloredBlocks") {{ coloredBlocks ? 'colors' : 'no colors' }}
	#grid(
		:style="{ '--width': width, '--height': height, '--baseColor': baseColor }",
		:class="{ generated: generated, mounted: true, 'cave-mode': caveMode, iterating: iterating, colors: coloredBlocks }"
	)
		template(v-for="(rows, x) in grid")
			.square(
				v-for="(square, y) in rows",
				:key="`${x}-${y}`",
				:class="[grid[x][y] ? 'filled' : '']",
				:style="{ '--islandColor': iterating ? 0 : islandsMap[x][y] }",
				:data-pos="`${x}-${y}`"
			)
</template>

<script>
import { toRaw, ref, watch, onMounted } from "vue";

export default {
	setup() {
		const grid = ref([]),
			width = 50,
			height = 50,
			maxIteration = ref(20),
			iteration = ref(1),
			iterating = ref(false),
			caveMode = ref(true),
			classicMode = ref(true),
			islandsMap = ref([]),
			baseColor = ref(0),
			weirdness = 2,
			coloredBlocks = ref(true),
			generated = ref(false);

		// Checks if an (x;y) point is a wall
		function isWall(x, y) {
			// in cave mode, points outside of the boundaries are considered walls
			if (x < 0 || x >= height || y < 0 || y >= width) {
				return caveMode.value;
			}
			return grid.value[x][y];
		}

		// Counts the amount of surrounding walls of a given cell
		function neighboringWallsCount(x, y) {
			let dimensions = classicMode.value
					? [-1, 0, 1]
					: [-1 * weirdness, 0, 1 * weirdness],
				num = 0;
			for (let check_x of dimensions) {
				for (let check_y of dimensions) {
					if (isWall(Number(x) + check_x, Number(y) + check_y)) {
						num++;
					}
				}
			}
			return num;
		}

		function iterate() {
			let newGrid = createGrid();

			// for each point of the current grid, to determine if the point will be a wall in the next gen:
			// 	- check a random occurence (1% divided by (the current iteration / 2) squared)
			//	- in cave mode, check if the point is an external boundary of the grid
			//	- check for the amount of neighboring walls (which includes diagonals and the point itself)
			for (let x in grid.value) {
				for (let y in grid.value[x]) {
					newGrid[x][y] =
						Math.random() < 0.01 / (iteration.value / 1.5) ** 2 ||
						(caveMode.value &&
							(x == 0 || y == 0 || x == height - 1 || y == width - 1)) ||
						neighboringWallsCount(x, y) >= 5;
				}
			}

			// replace the current gen with the next gen and increase the iteration counter
			grid.value = newGrid;
			iteration.value++;
		}

		// simple function to generate a two dimensional array (the grid) with a callback to fill it
		function createGrid(callback = null) {
			callback = callback != null ? callback : () => Math.random() < 0.445;
			return [...Array(height)].map(() => [...Array(width)].map(callback));
		}

		// DFS to identify each island (group of blocks not connected adjacently to another group of blocks) and assign it a unique ID
		function detectIslands() {
			let placesToCheck = createGrid(() => ""),
				islandId = 0;
			function dfs(x, y, islandId) {
				if (
					x < 0 ||
					x >= height ||
					y < 0 ||
					y >= width ||
					placesToCheck[x][y] !== ""
				) {
					return;
				}
				if (grid.value[x][y] === false) {
					return;
				}
				placesToCheck[x][y] = islandId;
				dfs(x - 1, y, islandId);
				dfs(Number(x) + 1, y, islandId);
				dfs(x, y - 1, islandId);
				dfs(x, Number(y) + 1, islandId);
			}

			for (let x in placesToCheck) {
				for (let y in placesToCheck[x]) {
					if (grid.value[x][y] === true && placesToCheck[x][y] === "") {
						dfs(x, y, islandId++);
					}
				}
			}
			return placesToCheck;
		}

		// fills some values and starts the iteration loop
		function initGrid() {
			generated.value = true;
			baseColor.value = ~~(Math.random() * 360);
			iterating.value = true;
			grid.value = createGrid();
			islandsMap.value = createGrid(() => false);
			let generating = setInterval(() =>
				iteration.value++ < maxIteration.value
					? iterate()
					: finalizeGeneration(generating)
			);
		}

		// clears the iteration loop once everything is done, resets the values used for the processing, and starts up the island detection
		function finalizeGeneration(id) {
			clearInterval(id);
			iterating.value = false;
			iteration.value = 0;
			islandsMap.value = detectIslands();
		}

		// reboot the generation when its parameters are changed
		watch(caveMode, initGrid);
		watch(classicMode, initGrid);

		return {
			grid,
			width,
			height,
			maxIteration,
			iteration,
			iterating,
			initGrid,
			caveMode,
			classicMode,
			islandsMap,
			coloredBlocks,
			baseColor,
			generated
		};
	}
};
</script>

<style lang="scss">
body {
	height: 100vh;
	margin: 0;
	background: #222;
	font-family: monospace;
	&,
	* {
		box-sizing: border-box;
	}
	display: flex;
	justify-content: center;
	align-items: center;

	#app {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		#ui {
			font-size: 0.7rem;
			padding-bottom: 0.75em;
			border-bottom: 1px solid #fff8;
			margin-bottom: 1em;

			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
			gap: 0;

			&.generated {
				gap: 1em;
			}
			* {
				transition: all 0.4s linear, clip-path 0.4s ease, padding 0s, border 0s;
				color: #fff8;
				font-size: inherit;
			}

			&:not(.generated) :not(#generate) {
				max-width: 0;
				opacity: 0;
				pointer-events: none;
				padding: 0;
				border: none;
				clip-path: polygon(50% 0%, 50% 100%, 50% 100%, 50% 0%);
			}

			&.generated :not(#generate) {
				max-width: 200px;
				opacity: 1;
				pointer-events: unset;
				clip-path: polygon(100% 0%, 100% 100%, 0% 100%, 0% 0%);
			}

			button {
				border-radius: 0;
				border: 1px solid #fff3;
				background-color: #0000;
				padding: 0.2em 0.75em;
				cursor: pointer;
				&:disabled {
					cursor: progress;
				}
			}
			input[type="checkbox"] {
				opacity: 0.01 !important;
				position: absolute;
				z-index: -1;
				& + label {
					border-radius: 0;
					border: 1px solid #fff3;
					background-color: #0000;
					padding: 0.2em 0.75em;
					cursor: pointer;
					&:is(:disabled + label) {
						cursor: progress;
					}
				}
			}
		}
		#grid {
			&:not(.mounted) {
				opacity: 0;
			}
			--size: min(calc(70vw / var(--width)), calc(70vh / var(--height)));
			transition: all 0.1s ease;
			display: grid;
			grid-template-columns: repeat(var(--width), 1fr);

			.square {
				display: inline-block;
				width: var(--size);
				font-size: 5px;
				aspect-ratio: 1;
				&.filled {
					background: #fff8;
					&:not(.iterating *):is(.colors *) {
						transition: all 0.4s linear;
						background: hsl(
							calc(var(--islandColor) * 97 + var(--baseColor)),
							70%,
							70%
						);
					}
				}
			}
		}
	}
}
</style>
 