function $(q) {
	return document.querySelector(q);
}

function lengthdir_x(len, dir) {
	return len * Math.cos(dir / 180 * Math.PI);
}

function lengthdir_y(len, dir) {
	return len * -Math.sin(dir / 180 * Math.PI);
}

//function Benchmark(avginterval, targetfps) {
//	/* NOT SURE THIS IS CORRECT / WORKS BUG-FREE
//	 *
//	 * let b = new Benchmark(30, 60);
//	 * console.log(b.frame())
//	 * => [57, 40, 59]
//	 *      |   |   |
//	 *      |   |   the average fps over the last avginterval frames
//	 *      |   the minimum fps, based on a single frame time, within the last avginterval frames 
//	 *      fps based on the most recent single frame time
//	 */
//
//	this.framecounter = 0;
//	this.lastframe = performance.now();
//	this.avgfpsstarttime = performance.now();
//	this.avgfps = -1;
//	this.avginterval = avginterval;
//	this.targetinterval = 1000 / targetfps; // ms
//	this.targetfps = targetfps;
//	this.minfps = targetfps;
//
//	this.frame = function() {
//		this.framecounter++;
//
//		if (this.framecounter % this.avginterval == 0) {
//			this.avgfps = this.targetinterval / ((performance.now() - this.avgfpsstarttime) / this.avginterval) * this.targetfps;
//			this.avgfpsstarttime = performance.now();
//			this.minfps = this.targetfps;
//		}
//
//		this.frametime = performance.now() - this.lastframe;
//		let nowfps = this.targetinterval / this.frametime * this.targetfps
//		this.minfps = Math.min(this.minfps, nowfps);
//
//		this.lastframe = performance.now();
//
//		return [nowfps, this.minfps, this.avgfps];
//	};
//}

