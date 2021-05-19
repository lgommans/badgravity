const SCALE = 1;

function Cart2(x,y) {
	this.x = 0;
	this.y = 0;
	if(x instanceof Cart2) {
		this.x = x.x;
		this.y = x.y;
	}
	else {
		if(x != undefined) {
			this.x = x;
			this.y = y;
		}
	}
	this.sub = function(a) {
		return new Cart2(this.x - a.x, this.y - a.y);
	}

	this.mult = function(m) {
		return new Cart2(this.x * m, this.y * m);
	}

	this.addTo = function(a) {
		this.x += a.x;
		this.y += a.y;
		return this;
	}

	this.invSumCube = function() {
		return Math.pow(this.x*this.x + this.y*this.y,-1.5);
	}

	this.abs = function() {
		return Math.sqrt(this.x*this.x + this.y*this.y);
	}

	this.toString = function(config) {
		let x = this.x;
		let y = this.y;
		let total = Math.sqrt(x*x + y*y);
		if (config && config.multiply) {
			x *= config.multiply;
			y *= config.multiply;
			total *= config.multiply;
		}
		if (config && config.round) {
			if (config.round === true) {
				x = Math.round(x);
				y = Math.round(y);
				total = Math.round(total);
			}
			else {
				let order = Math.pow(10, config.round);
				x = Math.round(x * order) / order;
				y = Math.round(y * order) / order;
				total = Math.round(total * order) / order;
			}
		}
		if (config && config.total) {
			return `${x},${y} ∑${total}`;
		}
		return `${x},${y}`;
	}

	this.toPagePos = function(scale) {
		return {
			x: (innerWidth / 2) + (this.x / SCALE),
			y: (innerHeight / 2) + (this.y / SCALE),
		};
	}
}

