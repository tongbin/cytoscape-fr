;(function(){ 'use strict';

var settings = {
  autoArea: true,
  area: 1,
  gravity: 10,
  speed: 0.1,
  iterations: 40000
};

function FruchtermanReingold() {
  var self = this;

  this.init = function (graph, options) {
    options = options || {};

    // Properties
    this.nodes = graph.nodes;
    this.edges = graph.edges;
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

    var nodes = this.nodes,
        edges = this.edges,
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
        n.fr_x = n.x;
        n.fr_y = n.y;
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
            repulsiveF = k * k / dist * 200;
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
      nSource = e.source;
      nTarget = e.target;

      xDist = nSource.fr_x - nTarget.fr_x;
      yDist = nSource.fr_y - nTarget.fr_y;
      dist = Math.sqrt(xDist * xDist + yDist * yDist) + 0.01;
      // dist = Math.sqrt(xDist * xDist + yDist * yDist) - nSource.size - nTarget.size;
      attractiveF = dist * dist / k * 0.08;

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

    var nodes = this.nodes;

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
    this.go();
  };

  this.stop = function() {
    var nodes = this.nodes;
    for (var i = 0; i < nodes.length; i++) {
      delete nodes[i].fr;
      // delete nodes[i].fr_x;
      // delete nodes[i].fr_y;
    }
  };

  this.kill = function() {
    this.sigInst = null;
    this.config = null;
    this.easing = null;
  };
}

  // registers the extension on a cytoscape lib ref
  var register = function( cytoscape ){

    if( !cytoscape ){ return; } // can't register if cytoscape unspecified

    var defaults = {
      // define the default options for your layout here
      animate: true,
      animationDuration: 500,
      padding: 100,
      refreshInterval: 16, // in ms
      refreshIterations: 10, // iterations until thread sends an update
      fit: true,
      autoArea: true,
      area: 1,
      gravity: 10,
      speed: 0.1,
      iterations: 10000
    };

    var extend = Object.assign || function( tgt ){
      for( var i = 1; i < arguments.length; i++ ){
        var obj = arguments[i];

        for( var k in obj ){ tgt[k] = obj[k]; }
      }

      return tgt;
    };

    function Layout( options ){
      this.options = extend( {}, defaults, options );
      var cy = options.cy;
      var eles = options.eles;
      var layout = this;
      this.vc = {
        x: cy.renderer().containerBB.width / 2,
        y: cy.renderer().containerBB.height / 2
      };
      var nodes = eles.nodes().map(function(n) {
        return {
          id: n.id(),
          x: n.position().x - layout.vc.x,
          y: n.position().y - layout.vc.y,
          fixed: n.locked()
        };
      });
      var nodesMap = nodes.reduce(function(m, n){
        m[n.id] = n;
        return m;
      }, {});
      var edges = eles.edges().map(function(e){
        return {
          id: e.id(),
          source: nodesMap[e.data('source')],
          target: nodesMap[e.data('target')]
        };
      });
      this.nodes = nodes;
      this.edges = edges;
      this.nodesMap = nodesMap;
      this.fr = new FruchtermanReingold();

      this.fr.init({
        nodes: nodes, edges: edges
      }, this.options);
    }

    Layout.prototype.run = function(){
      var layout = this;
      var options = this.options;
      var cy = options.cy;
      var eles = options.eles;
      var cbb;
      var hasFixed = true;
      this.fr.run();
      var nextPos = function( i, ele ){
        return {
          x: layout.nodesMap[ele.id()].fr_x,
          y: layout.nodesMap[ele.id()].fr_y
        };
      };
      // rescale

      if (!options.fit) {
        cbb = cy.renderer().containerBB;
        // move the points into the view
        layout.nodes.forEach(function(n){
          n.fr_x = n.fr_x + layout.vc.x;
          n.fr_y = n.fr_y + layout.vc.y;
        });
      }

      eles.nodes().layoutPositions( layout, {
        animate: options.animate,
        animationDuration: options.animationDuration,
        fit: options.fit,
        padding: options.padding
      }, nextPos );

      return this;

    };

    Layout.prototype.stop = function(){
      // continuous/asynchronous layout may want to set a flag etc to let
      // run() know to stop

      this.trigger('layoutstop');

      return this; // chaining
    };

    Layout.prototype.destroy = function(){
      // clean up here if you create threads etc

      if( this.thread ){
        this.thread.stop();
      }

      return this; // chaining
    };

    cytoscape( 'layout', 'fr', Layout ); // register with cytoscape.js

  };

  if( typeof module !== 'undefined' && module.exports ){ // expose as a commonjs module
    module.exports = register;
  }

  if( typeof define !== 'undefined' && define.amd ){ // expose as an amd/requirejs module
    define('cytoscape-fr', function(){
      return register;
    });
  }

  if( typeof cytoscape !== 'undefined' ){ // expose to global cytoscape (i.e. window.cytoscape)
    register( cytoscape );
  }

})();
