var LLK = {
    $stage: null,
    $time: null,
    types: ["red", "blue", "green", "pink", "black"],
    rows: 6,
    cols: 4,
    width: 70,
    height: 70,
    gap: 10,
    matrix: [],
    pairs: null,
    selected: null,
    time: 30,
    score: 0,
    timeLeft: null,
    timer: null,
    playing: false,

    random: function(min, max) {
        if (max == null) {
            max = min;
            min = 0;
        };
        return min + Math.floor(Math.random() * (max - min + 1));
    },

    shuffle: function(array) {
        var length = array.length;
        var shuffled = Array(length);
        for (var index = 0, rand; index < length; index++) {
            rand = this.random(0, index);
            if (rand !== index) shuffled[index] = shuffled[rand];
            shuffled[rand] = array[index];
        }
        return shuffled;
    },

    getFormattedTime: function(seconds) {
        var minutes = Math.floor(seconds / 60);
        var seconds = seconds % 60;
        return (minutes >= 10 ? minutes : "0" + minutes) + ":" + (seconds >= 10 ? seconds : "0" + seconds);
    },

    init: function(element, options) {
        function transitionendHandler(event) {
            var target = event.target;
            if (target.classList.contains("killed")) target.parentNode.removeChild(target);
        };

        this.$stage = typeof element == "string" ? document.querySelector(element) : element;
        this.$stage.addEventListener("transitionend", transitionendHandler, false);
        this.$stage.addEventListener("msTransitionEnd", transitionendHandler, false);
        this.$stage.addEventListener("webkitTransitionEnd", transitionendHandler, false);

        if (options) {
            if (options.$time) this.$time = typeof options.$time == "string" ? document.querySelector(options.$time) : options.$time;
            if (options.types) this.types = options.types;
            if (options.rows) this.rows = options.rows;
            if (options.cols) this.rows = options.cols;
            if (options.width) this.width = options.width;
            if (options.height) this.height = options.height;
            if (options.gap) this.gap = options.gap;
            if (options.pairs) this.pairs = options.pairs;
            if (options.time) this.time = options.time;
        };

        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        canvas.width = (this.cols + 2) * (this.width + this.gap) - this.gap;
        canvas.height = (this.rows + 2) * (this.height + this.gap) - this.gap;
        canvas.style.top = -this.height - this.gap + "px";
        canvas.style.left = -this.width - this.gap + "px";
        ctx.translate(this.width + this.gap, this.height + this.gap);
        this.$stage.appendChild(canvas);
        this.$canvas = canvas;
        this.$ctx = ctx;
    },

    countdown: function() {
        var self = this;
        this.timeLeft--;
        this.$time.innerHTML = this.getFormattedTime(this.timeLeft);
        if (this.timeLeft > 0) {
            this.timer = setTimeout(function() {
                self.countdown();
            }, 1e3);
        } else {
            setTimeout(function() {
                self.over();
            }, 1e3);
        };
    },

    play: function() {
        var self = this;
        this.score = 0;
        this.timeLeft = this.time;
        this.$time.innerHTML = this.getFormattedTime(this.timeLeft);
        this.timer = setTimeout(function() {
            self.countdown();
        }, 1e3);
        this.build();
        this.playing = true;
    },

    over: function() {
        this.playing = false;
        alert("Time's Up! \nScore: " + this.score);
    },

    bingo: function(type) {
        this.score++;
        //console.log("bingo", type);
    },

    build: function() {
        var self = this;
        var fragment = document.createDocumentFragment();
        var tiles = new Array(this.rows * this.cols);
        var count = this.types.length - 1;

        if (!this.pairs) this.pairs = this.rows * this.cols / 2;

        for (var i = 0, l = this.pairs * 2; i < l;) {
            tiles[i] = tiles[i + 1] = this.types[this.random(count)];
            i += 2;
        };

        tiles = this.shuffle(tiles);

        for (var row = 0; row < this.rows; row++) {
            this.matrix[row] = [];
            for (var col = 0; col < this.cols; col++) {
                var type = tiles.shift();
                if (!type) {
                    this.matrix[row][col] = null;
                    continue;
                };
                var tile = document.createElement("div");
                tile.style.top = (row * (this.height + this.gap)) + "px";
                tile.style.left = (col * (this.width + this.gap)) + "px";
                tile.x = col;
                tile.y = row;
                tile.type = type;
                tile.className = "tile " + type;
                tile.addEventListener("ontouchend" in window ? "touchend" : "click", function(event) {
                    self.handleClick.call(self, event);
                }, false);
                fragment.appendChild(tile);
                this.matrix[row][col] = {
                    type: type,
                    el: tile
                };
            };
        };
        this.matrix[-1] = this.matrix[this.rows] = [];

        Array.prototype.forEach.call(this.$stage.querySelectorAll(".tile"), function(tile) {
            tile.parentNode.removeChild(tile);
        });
        this.$stage.appendChild(fragment);
    },

    handleClick: function(event) {
        if (!this.playing) return;
        var self = this;
        var curr = event.target;
        curr.classList.toggle("selected");

        if (curr.classList.contains("selected")) {
            if (this.selected) {
                var prev = this.selected;
                if (curr.type == prev.type) {
                    var linkable = this.checkLinkable(prev, curr);
                    if (linkable) {
                        this.bingo(curr.type);
                        this.selected = null;
                        if (linkable === true) {
                            this.killPath([prev, curr]);
                        } else {
                            linkable.unshift(prev);
                            linkable.push(curr);
                            this.killPath(linkable);
                        };

                        if (this.$stage.querySelectorAll(".tile").length == 0 || !this.findPair()) {
                            setTimeout(function() {
                                self.build();
                            }, 1e3);
                        };
                        //console.clear();
                        //console.table(matrix);
                    } else {
                        prev.classList.remove("selected");
                        this.selected = curr;
                    };
                } else {
                    prev.classList.remove("selected");
                    this.selected = curr;
                };
            } else {
                this.selected = curr;
            };
        } else {
            this.selected = null;
        };
    },

    killTile: function(row, col) {
        var tile = this.matrix[row][col];
        if (tile) {
            var el = tile.el;
            if (el) el.classList.add("killed");
            this.matrix[row][col] = null;
        };
    },

    killPath: function(points) {
        this.$ctx.beginPath();
        this.$ctx.moveTo(points[0].x * (this.width + this.gap) + this.width / 2, points[0].y * (this.height + this.gap) + this.height / 2);

        for (var i = 0, l = points.length - 1; i < l; i++) {
            var a = points[i];
            var b = points[i + 1];

            this.$ctx.lineTo(b.x * (this.width + this.gap) + this.width / 2, b.y * (this.height + this.gap) + this.height / 2);

            if (a.x == b.x) {
                // 列
                var min = Math.min(a.y, b.y);
                var max = Math.max(a.y, b.y);
                for (var j = min; j <= max; j++) {
                    this.killTile(j, a.x);
                };
            } else {
                // 行
                var min = Math.min(a.x, b.x);
                var max = Math.max(a.x, b.x);
                for (var j = min; j <= max; j++) {
                    this.killTile(a.y, j);
                };
            };
        };
        this.$ctx.stroke();

        var self = this;
        setTimeout(function(){
            self.$ctx.save();
            self.$ctx.translate(-self.width + -self.gap, -self.height + -self.gap);
            self.$ctx.clearRect(0, 0, self.$canvas.width, self.$canvas.height);
            self.$ctx.restore();
        }, 200);
    },

    checkLinkable: function(a, b) {
        var linkable;

        // 直线
        linkable = this.checkOneLineLinkable(a, b);
        if (linkable) return linkable;

        // 拐 1 次弯
        linkable = this.checkTwoLineLinkable(a, b);
        if (linkable) return [linkable];

        // 拐 2 次弯
        linkable = this.checkThreeLineLinkable(a, b);
        if (linkable) return linkable;

        return false;
    },

    checkSiblingLinkable: function(a, b) {
        return ((a.x == b.x) && Math.abs(a.y - b.y) == 1) || ((a.y == b.y) && Math.abs(a.x - b.x) == 1);
    },

    checkOneLineLinkable: function(a, b) {
        if (!(a.x == b.x || a.y == b.y)) return false;
        if (this.checkSiblingLinkable(a, b)) return true;

        var linkable = true;

        if (a.y == b.y) {
            // 同一行
            var min = Math.min(a.x, b.x);
            var max = Math.max(a.x, b.x);
            for (var i = min + 1; i < max; i++) {
                if (this.matrix[a.y][i]) {
                    linkable = false;
                    break;
                };
            };
        } else {
            // 同一列
            var min = Math.min(a.y, b.y);
            var max = Math.max(a.y, b.y);
            for (var i = min + 1; i < max; i++) {
                if (this.matrix[i][a.x]) {
                    linkable = false;
                    break;
                };
            };
        };

        return linkable;
    },

    checkTwoLineLinkable: function(a, b) {
        var point1 = {
            x: b.x,
            y: a.y
        };
        var point2 = {
            x: a.x,
            y: b.y
        };
        if (!this.matrix[point1.y][point1.x] && this.checkOneLineLinkable(a, point1) && this.checkOneLineLinkable(b, point1)) return point1;
        if (!this.matrix[point2.y][point2.x] && this.checkOneLineLinkable(a, point2) && this.checkOneLineLinkable(b, point2)) return point2;
        return false;
    },

    checkThreeLineLinkable: function(a, b) {
        var point1, point2;

        // 向上查找
        for (var i = a.y - 1; i >= -1; i--) {
            point1 = {
                x: a.x,
                y: i
            };
            if (this.matrix[point1.y][point1.x]) break;
            point2 = this.checkTwoLineLinkable(point1, b);
            if (point2) break;
        };
        if (point2) return [point1, point2];

        // 向下查找
        for (var i = a.y + 1; i <= this.rows; i++) {
            point1 = {
                x: a.x,
                y: i
            };
            if (this.matrix[point1.y][point1.x]) break;
            point2 = this.checkTwoLineLinkable(point1, b);
            if (point2) break;
        };
        if (point2) return [point1, point2];

        // 向左查找
        for (var i = a.x - 1; i >= -1; i--) {
            point1 = {
                x: i,
                y: a.y
            };
            if (this.matrix[point1.y][point1.x]) break;
            point2 = this.checkTwoLineLinkable(point1, b);
            if (point2) break;
        };
        if (point2) return [point1, point2];

        // 向右查找
        for (var i = a.x + 1; i <= this.cols; i++) {
            point1 = {
                x: i,
                y: a.y
            };
            if (this.matrix[point1.y][point1.x]) break;
            point2 = this.checkTwoLineLinkable(point1, b);
            if (point2) break;
        };
        if (point2) return [point1, point2];

        return false;
    },

    findPair: function() {
        var pair = false;
        var rows = this.rows;
        var cols = this.cols;
        for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
                var a = {
                    x: col,
                    y: row
                };
                if (!this.matrix[row][col]) continue;
                var aType = this.matrix[row][col].type;
                for (var row2 = 0; row2 < rows; row2++) {
                    for (var col2 = 0; col2 < cols; col2++) {
                        var b = {
                            x: col2,
                            y: row2
                        };
                        if (!this.matrix[row2][col2]) continue;
                        var bType = this.matrix[row2][col2].type;
                        if ((aType != bType) || (row == row2 && col == col2)) continue;
                        var linkable = this.checkLinkable(a, b);
                        if (linkable) {
                            pair = [a, b];
                            break;
                        };
                    };
                    if (pair) break;
                };
                if (pair) break;
            };
            if (pair) break;
        };
        return pair;
    }
};

LLK.init("#stage", {
    //pairs: 5,
    $time: "#time"
});
LLK.play();