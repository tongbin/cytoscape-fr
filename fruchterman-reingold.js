/**
 * Sigma Fruchterman-Reingold
 * ===============================
 *
 * Author: Sébastien Heymann @ Linkurious
 * Version: 0.1
 */


var settings = {
  autoArea: true,
  area: 1,
  gravity: 10,
  speed: 0.1,
  iterations: 1000
};

var _instance = {};


/**
 * Event emitter Object
 * ------------------
 */
var _eventEmitter = {};


/**
 * Fruchterman Object
 * ------------------
 */
function FruchtermanReingold() {
  var self = this;

  this.init = function (cy, options) {
    options = options || {};

    // Properties
    this.cy = cy;
    this.config = Object.assign({}, options, settings);
    this.easing = options.easing;
    this.duration = options.duration;

    // State
    this.running = false;
  };

  /**
   * Single layout iteration.
   */
  this.atomicGo = function () {
    if (!this.running || this.iterCount < 1) return false;

    var nodes = this.cy.nodes(),
        edges = this.cy.edges(),
        i,
        j,
        n,
        n2,
        e,
        xDist,
        yDist,
        dist,
        repulsiveF,
        nodesCount = nodes.length,
        edgesCount = edges.length;

    this.config.area = this.config.autoArea ? (nodesCount * nodesCount) : this.config.area;
    this.iterCount--;
    this.running = (this.iterCount > 0);

    var maxDisplace = Math.sqrt(this.config.area) / 10,
        k = Math.sqrt(this.config.area / (1 + nodesCount));

    for (i = 0; i < nodesCount; i++) {
      n = nodes[i];

      // Init
      if (!n.fr) {
        n.fr_x = n.position.x;
        n.fr_y = n.positiony;
        n.fr = {
          dx: 0,
          dy: 0
        };
      }

      for (j = 0; j < nodesCount; j++) {
        n2 = nodes[j];

        // Repulsion force
        if (n.id != n2.id) {
          xDist = n.fr_x - n2.fr_x;
          yDist = n.fr_y - n2.fr_y;
          dist = Math.sqrt(xDist * xDist + yDist * yDist) + 0.01;
          // var dist = Math.sqrt(xDist * xDist + yDist * yDist) - n1.size - n2.size;

          if (dist > 0) {
            repulsiveF = k * k / dist;
            n.fr.dx += xDist / dist * repulsiveF;
            n.fr.dy += yDist / dist * repulsiveF;
          }
        }
      }
    }

    var nSource,
        nTarget,
        attractiveF;

    for (i = 0; i < edgesCount; i++) {
      e = edges[i];

      // Attraction force
      nSource = e._private.source;
      nTarget = e._private.target;

      xDist = nSource.fr_x - nTarget.fr_x;
      yDist = nSource.fr_y - nTarget.fr_y;
      dist = Math.sqrt(xDist * xDist + yDist * yDist) + 0.01;
      // dist = Math.sqrt(xDist * xDist + yDist * yDist) - nSource.size - nTarget.size;
      attractiveF = dist * dist / k;

      if (dist > 0) {
        nSource.fr.dx -= xDist / dist * attractiveF;
        nSource.fr.dy -= yDist / dist * attractiveF;
        nTarget.fr.dx += xDist / dist * attractiveF;
        nTarget.fr.dy += yDist / dist * attractiveF;
      }
    }

    var d,
        gf,
        limitedDist;

    for (i = 0; i < nodesCount; i++) {
      n = nodes[i];

      // Gravity
      d = Math.sqrt(n.fr_x * n.fr_x + n.fr_y * n.fr_y);
      gf = 0.01 * k * self.config.gravity * d;
      n.fr.dx -= gf * n.fr_x / d;
      n.fr.dy -= gf * n.fr_y / d;

      // Speed
      n.fr.dx *= self.config.speed;
      n.fr.dy *= self.config.speed;

      // Apply computed displacement
      if (!n.fixed) {
        xDist = n.fr.dx;
        yDist = n.fr.dy;
        dist = Math.sqrt(xDist * xDist + yDist * yDist);

        if (dist > 0) {
          limitedDist = Math.min(maxDisplace * self.config.speed, dist);
          n.fr_x += xDist / dist * limitedDist;
          n.fr_y += yDist / dist * limitedDist;
        }
      }
    }

    return this.running;
  };

  this.go = function () {
    this.iterCount = this.config.iterations;

    while (this.running) {
      this.atomicGo();
    }

    this.stop();
  };

  this.run = function() {
    if (this.running) return;

    var nodes = this.cy.nodes();

    this.running = true;

    // Init nodes
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].fr_x = nodes[i].x;
      nodes[i].fr_y = nodes[i].y;
      nodes[i].fr = {
        dx: 0,
        dy: 0
      };
    }
    this.trigger({type: 'layoutstart', layout: this});
    this.go();
  };

  function getBoundaries(nodes) {
    var bb = {minX: Infinity, minY: Infinity, maxX: -Infinity, MaxY: -Infinity};
    nodes.forEach(function(n){
      if (n.fr_x < bb.minX) {
        bb.minX = n.fr_x;
      }
      if (n.fr_y < bb.minY) {
        bb.minY = n.fr_y;
      }
      if (n.fr_x > bb.maxX) {
        bb.maxX = n.fr_x;
      }
      if (n.fr_y > bb.maxY) {
        bb.maxY = n.fr_y;
      }
    });
  }

  function rescale(){
    var nodes = this.cy.nodes();
    var boundary = getBoundaries(this.cy.nodes());
    //We've inside the graph
    var ratio = 1, i, j;
    var s = self.sigInst, nodes = this.cy.nodes(), l = nodes.length, d, md = Infinity, maxd = -Infinity,MD = 128, da = [], MAXD = 200;
    if (l >= 2) {
      for (var i = l; i >= 0; i--) {
        da.push([]);
      }
      for (i = 0; i < l; i++) {
        da[i][i] = Infinity;
        for (j = i + 1; j < l; j++) {
          da[i][j] = Math.pow(nodes[i].fr_x - nodes[j].fr_x, 2) + Math.pow((nodes[i].fr_y - nodes[j].fr_y), 2);
          da[j][i] = da[i][j];
          md = Math.min(md, da[i][j]);
        }
      }
      for (i = l - 1; i >= 0; i--) {
        maxd = Math.max(maxd, Math.min.apply(null, da[i]));
      }
      ratio = Math.min(MD/Math.sqrt(md), MAXD/Math.sqrt(maxd));
    }
    var center = {x: (boundary.maxX + boundary.minX) /2, y: (boundary.maxY + boundary.minY)/2};
    //rescale the nodes
    self.sigInst.graph.nodes().forEach(function(n){
      n.fr_x = ratio*(n.fr_x - center.x);
      n.fr_y = ratio*(n.fr_y - center.y);
    });
  }

  this.stop = function() {
    var nodes = this.sigInst.graph.nodes();

    this.running = false;

    if (this.easing) {
      _eventEmitter[self.sigInst.id].dispatchEvent('interpolate');
      //Rescale manually
      rescale();
      // sigma.plugins.animate(
      //   self.sigInst,
      //   {
      //     x: 'fr_x',
      //     y: 'fr_y'
      //   },
      //   {
      //     easing: self.easing,
      //     onComplete: function() {
      //       self.sigInst.refresh();
      //       for (var i = 0; i < nodes.length; i++) {
      //         nodes[i].fr = null;
      //         nodes[i].fr_x = null;
      //         nodes[i].fr_y = null;
      //       }
      //       // _eventEmitter[self.sigInst.id].dispatchEvent('stop');
      //       self.cy.trigger('layoutstop');
      //     },
      //     duration: self.duration
      //   }
      // );
    }
    else {
      // Apply changes
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].position({
          x: nodes[i].fr_x,
          y: nodes[i].fr_y
        });
      }

      this.cy.refresh();

      for (var i = 0; i < nodes.length; i++) {
        delete nodes[i].fr;
        delete nodes[i].fr_x;
        delete nodes[i].fr_y;
      }
       self.trigger({type: 'layoutstop', layout: self});
    }
  };

  this.kill = function() {
    this.sigInst = null;
    this.config = null;
    this.easing = null;
  };
}



/**
 * Interface
 * ----------
 */

/**
 * Configure the layout algorithm.

  * Recognized options:
  * **********************
  * Here is the exhaustive list of every accepted parameters in the settings
  * object:
  *
  *   {?boolean}           autoArea   If `true`, area will be computed as N².
  *   {?number}            area       The area of the graph.
  *   {?number}            gravity    This force attracts all nodes to the
  *                                   center to avoid dispersion of
  *                                   disconnected components.
  *   {?number}            speed      A greater value increases the
  *                                   convergence speed at the cost of precision loss.
  *   {?number}            iterations The number of iterations to perform
  *                                   before the layout completes.
  *   {?(function|string)} easing     Either the name of an easing in the
  *                                   sigma.utils.easings package or a
  *                                   function. If not specified, the
  *                                   quadraticInOut easing from this package
  *                                   will be used instead.
  *   {?number}            duration   The duration of the animation. If not
  *                                   specified, the "animationsTime" setting
  *                                   value of the sigma instance will be used
  *                                   instead.
  *
  *
  * @param  {sigma}   sigInst The related sigma instance.
  * @param  {object} config  The optional configuration object.
  *
  * @return {sigma.classes.dispatcher} Returns an event emitter.
  */
sigma.layouts.fruchtermanReingold.configure = function(sigInst, config) {
  if (!sigInst) throw new Error('Missing argument: "sigInst"');
  if (!config) throw new Error('Missing argument: "config"');

  // Create instance if undefined
  if (!_instance[sigInst.id]) {
    _instance[sigInst.id] = new FruchtermanReingold();

    _eventEmitter[sigInst.id] = {};
    sigma.classes.dispatcher.extend(_eventEmitter[sigInst.id]);

    // Binding on kill to clear the references
    sigInst.bind('kill', function() {
      _instance[sigInst.id].kill();
      _instance[sigInst.id] = null;
      _eventEmitter[sigInst.id] = null;
    });
  }

  _instance[sigInst.id].init(sigInst, config);

  return _eventEmitter[sigInst.id];
};

/**
 * Start the layout algorithm. It will use the existing configuration if no
 * new configuration is passed.

  * Recognized options:
  * **********************
  * Here is the exhaustive list of every accepted parameters in the settings
  * object:
  *
  *   {?boolean}           autoArea   If `true`, area will be computed as N².
  *   {?number}            area       The area of the graph.
  *   {?number}            gravity    This force attracts all nodes to the
  *                                   center to avoid dispersion of
  *                                   disconnected components.
  *   {?number}            speed      A greater value increases the
  *                                   convergence speed at the cost of precision loss.
  *   {?number}            iterations The number of iterations to perform
  *                                   before the layout completes.
  *   {?(function|string)} easing     Either the name of an easing in the
  *                                   sigma.utils.easings package or a
  *                                   function. If not specified, the
  *                                   quadraticInOut easing from this package
  *                                   will be used instead.
  *   {?number}            duration   The duration of the animation. If not
  *                                   specified, the "animationsTime" setting
  *                                   value of the sigma instance will be used
  *                                   instead.
  *
  *
  * @param  {sigma}   sigInst The related sigma instance.
  * @param  {?object} config  The optional configuration object.
  *
  * @return {sigma.classes.dispatcher} Returns an event emitter.
  */
sigma.layouts.fruchtermanReingold.start = function(sigInst, config) {
  if (!sigInst) throw new Error('Missing argument: "sigInst"');

  if (config) {
    this.configure(sigInst, config);
  }

  _instance[sigInst.id].start();

  return _eventEmitter[sigInst.id];
};

/**
 * Returns true if the layout has started and is not completed.
 *
 * @param  {sigma}   sigInst The related sigma instance.
 *
 * @return {boolean}
 */
sigma.layouts.fruchtermanReingold.isRunning = function(sigInst) {
  if (!sigInst) throw new Error('Missing argument: "sigInst"');

  return !!_instance[sigInst.id] && _instance[sigInst.id].running;
};

/**
 * Returns the number of iterations done divided by the total number of
 * iterations to perform.
 *
 * @param  {sigma}   sigInst The related sigma instance.
 *
 * @return {number} A value between 0 and 1.
 */
sigma.layouts.fruchtermanReingold.progress = function(sigInst) {
  if (!sigInst) throw new Error('Missing argument: "sigInst"');

  return (_instance[sigInst.id].config.iterations - _instance[sigInst.id].iterCount) /
    _instance[sigInst.id].config.iterations;
};