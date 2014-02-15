/**
 * Berkeley Health Rating Inspector
 *
 * Author: Colorado Reed (colorado _AT_ berkeley.edu)
 * 15 Oct 2013
 */

  /* TODO global refactorization using OOP */

(function(d3, topojson){

  //
  /*******************
   *     Setup       *
   *******************/
  //

  /*
   * Consts and "global" variables
   */
  var viewConsts = {
    summaryClass: "hover-summary",
    selectedClass: "selected",
    summaryWidth: 350,
    SQRT2DIV2: Math.sqrt(2)/2,
    nodeR: 2.7,
    nodeRInset: 6,
    noteClass: "note",
    blueBoxId: "little-blue-box",
    hcodeText: {
      1: "Minor violation for ",
      2: "Major violation for "
    },
    hcodeClass: {
      1: "minor",
      2: "major"
    }
  };

  var KEYCODES = {UP: 38, DOWN: 40, ENTER: 13},
      selNum = 0;

  /* data properties of the input data */
  var cols = ["absent-data", "clean", "little-health", "medium-health", "severe-health"],
      dataProps = {"vtemp": "improper holding temperature",
                   "vcontam": "contaminated equiptment",
                   "vcook": "inadequate cooking",
                   "vhygiene": "personal hygiene",
                   "vsource": "unsafe food source"},
      dpLen = dataProps.length;

  // variables for window resizing
  var docEl = document.documentElement,
      bodyEl = document.getElementsByTagName('body')[0],
      width = 500,
      height = 500;
  // set height and width
  updateWindow();

  /* keep track of the visible nodes */
  var circles,
      insetCircles,
      circleData;

  /* Setup the main map */
  var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height),
      svgG = svg.append("g"),
      tiler = d3.geo.tile()
        .size([width, height]),
      projection = d3.geo.mercator()
        .center([-122.290, 37.8695])
        .scale((1 << 21) / Math.PI)
        .translate([width / 2, height / 2]),
      path = d3.geo.path()
        .projection(projection);

  /* setup the inset map */
  var insetState = {
    zoomLevel: 8,
    pos: [-122.26858524322512, 37.871566519480986]
  },
      insetWidth = 300,
      insetHeight = 400,
      svgInset = d3.select("body").append("svg")
        .attr("id", "inset")
        .attr("height", insetHeight)
        .attr("width", insetWidth),
      svgInsetG = svgInset.append("g"),
      projInset;

  //
  /*******************
   * Main Application*
   *******************/
  //

  /* load the main map */
  svgG.selectAll("g")
    .data(tiler
          .scale(projection.scale() * 2 * Math.PI)
          .translate(projection([0, 0])))
    .enter()
    .append("g")
    .each(function(d) {
      var g = d3.select(this);
      // TODO can we obtain the ocean and whatnot?
      d3.json("http://" + ["a", "b", "c"][(d[0] * 31 + d[1]) % 3]
              + ".tile.openstreetmap.us/vectiles-highroad/" + d[2]
              + "/" + d[0] + "/" + d[1] + ".json", function(error, json) {
                g.selectAll("path")
                  .data(json.features.sort(function(a, b){ return a.properties.sort_key - b.properties.sort_key; }))
                  .enter().append("path")
                  .attr("class", function(d) { return d.properties.kind; })
                  .attr("d", path);
              });
    });

  /* load the data */
  d3.csv("Data/geo_food_data.csv", function(data){
    // cache the results
    circleData = data;
    // main circles
    circles = svgG.append("g").selectAll("circle").data(data);
    addCircleProps(circles, projection, viewConsts.nodeR);
    redrawInset();
    // inset circles
    insetCircles = svgInsetG.append("g").selectAll("circle").data(data);
    addCircleProps(insetCircles, projInset, viewConsts.nodeRInset);
  });


  // hardcoded place UCB Campus text for orientation
  svgG.selectAll("text").data([{text: "U.C.B Campus", pos:[-122.26515201568603, 37.87258281927452] }])
    .enter().append("text")
    .attr("x", function(d){ return projection(d.pos)[0];})
    .attr("y", function(d){ return projection(d.pos)[1];})
    .text(function(d){return d.text;})
    .attr("fill","#E097E0");

  // hardcode a legend in the upper right
  var basePos = projection.invert([-122.2533502960205, 37.88670793455764]),
      svgGG = svg.append("g");

  svgGG.selectAll("circle")
      .attr("cx", basePos[0])
      .attr("cy", basePos[1])
      .classed(cols[1], true)
      .attr("r", 20)
      .attr("fill", "blue");

  // listen for mousedown events on the svg (move the inset box)
  d3.select(document.body).on("keydown", keyDown);
  svg.on("mouseup", function(){
    insetState.pos = projection.invert(d3.mouse(this));
    redrawInset();
  });

  // listen for key events on the text input
  d3.select("#user-text").on("keyup", textKeyUp);

  window.onresize = updateWindow;


  //
  /*******************
   *    Functions    *
   *******************/
  //

  /* handle window resizing */
  function updateWindow(){
    width = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
    height = window.innerHeight|| docEl.clientHeight|| bodyEl.clientHeight;
    if (svg){
      svg.attr("width", width).attr("height", height);
    }
  }

  /* redraw the svg inset */
  function redrawInset(){
    svgInsetG.selectAll("g").remove(); // TODO fix this hack

    var insetTiler = d3.geo.tile()
          .size([insetWidth, insetHeight]);

    svgInsetG.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", insetWidth)
      .attr("height", insetHeight);

    console.log(insetState.pos);
    // move little blue box in main SVG
    var bbId = viewConsts.blueBoxId,
        posMain = projection(insetState.pos);
    var box = svgG.select("#" + viewConsts.blueBoxId),
        boxWidth = insetWidth/insetState.zoomLevel,
        boxHeight = insetHeight/insetState.zoomLevel;
    if (box.node()){
      box.attr("x", posMain[0] - boxWidth/2)
        .attr("y", posMain[1] - boxHeight/2)
        .attr("width", boxWidth)
        .attr("height", boxHeight);
    } else{
      svgG.append("rect")
        .attr("x", posMain[0] - boxWidth/2)
        .attr("y", posMain[1] - boxHeight/2)
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("id", viewConsts.blueBoxId);
    }

    // redraw interior inset
    projInset = d3.geo.mercator()
      .center(insetState.pos)
      .scale((1 << 21) / Math.PI * insetState.zoomLevel)
      .translate([insetWidth / 2, insetHeight / 2]);
    var insetPath = d3.geo.path()
          .projection(projInset);

    /* Setup the inset TODO remove code repetition*/
    svgInsetG.selectAll("g")
      .data(insetTiler.scale(projInset.scale() * 2 * Math.PI)
            .translate(projInset([0, 0])))
      .enter()
      .append("g")
      .each(function(d) {
        var g = d3.select(this);
        d3.json("http://" + ["a", "b", "c"][(d[0] * 31 + d[1]) % 3]
                + ".tile.openstreetmap.us/vectiles-highroad/" + d[2]
                + "/" + d[0] + "/" + d[1] + ".json",
                function(error, json) {
                  g.selectAll("path")
                    .data(json.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }))
                    .enter().append("path")
                    .attr("class", function(d) { return d.properties.kind; })
                    .attr("d", insetPath);
                });
        });
    if (insetCircles){
      insetCircles.remove();
      // TODO this is sloppy, fix!
      insetCircles = svgInsetG.append("g").selectAll("circle").data(circleData);
      addCircleProps(insetCircles, projInset, viewConsts.nodeRInset);
    }
  } // end of redrawInset

  function addCircleProps(circles, proj, nodeR){
    circles.enter().append("circle")
      .attr("cx", function(d){ return proj([d.lng, d.lat])[0]; })
      .attr("cy", function(d){ return proj([d.lng, d.lat])[1]; })
      .attr("r", function(d){
        return d.hidden ? 0 : nodeR;
      })
      .on("mouseover", function(d){
        var d3this = d3.select(this);
        d3this.attr("r", 10);
        d3.selectAll("." + viewConsts.summaryClass).remove();
        showSummary(d, d3this);
      })
      .on("mouseout", function(d){
        d3.select(this).attr("r", nodeR);
        d3.selectAll("." + viewConsts.summaryClass).remove();
      })
      .each(function(d){
        var sum = 1;
        for (var dp in dataProps){
          sum += Number(d[dp] == 2 ? 3 : d[dp]);
        }
        sum = sum < 0 ? 0 : (sum > 4 ? 4 : sum);
        d.hr = sum;
        d.name = d.name.toLowerCase().replace(/&amp;/g,"&");
      })
      .attr("class", function(d){
        return cols[d.hr];
      })
      .sort(function(a, b){
        return a.hr - b.hr;
      });
  }

  /* Get the location of the summary box */
  function getSummaryBoxPlacement(nodeRect, placeLeft){
    var leftMultSign = placeLeft ? -1: 1,
        shiftDiff = (1 + leftMultSign*viewConsts.SQRT2DIV2)*nodeRect.width/2 + leftMultSign;
    if (placeLeft){shiftDiff -= viewConsts.summaryWidth;}
    return {
      top:  (nodeRect.top + (1-viewConsts.SQRT2DIV2)*nodeRect.height/2) + "px",
      left:  (nodeRect.left + shiftDiff) + "px"
    };
  }

  /* draw the summary box */
  function showSummary(d, node){
    var div = document.createElement("div"),
        nodeId = node.attr("id");

    var wrapDiv = d3.select("body").append("div").classed(viewConsts.summaryClass, true).classed(cols[d.hr], true);
    var nodeRect = node.node().getBoundingClientRect(),
        placeLeft = nodeRect.left + nodeRect.width / 2 > window.innerWidth / 2;
    var sumLoc = getSummaryBoxPlacement(nodeRect, placeLeft);

    wrapDiv.style("left", sumLoc.left)
      .style("top", sumLoc.top)
      .style("width", viewConsts.summaryWidth + "px");

    // restaurant title
    wrapDiv.append("h1")
      .text(toCapCase(d.name));
    // date of review
    wrapDiv.append("h3").text(toCapCase(d.address));
    wrapDiv.append("h3").text("reviewed: " + d.date);
    // violation list
    if (d.hr <= 1){
      var text = d.hr == 0 ? "no health inspections" : "clean health inspection";
      wrapDiv.append("p").attr("class", viewConsts.noteClass).text(text);
    } else {
      var ul = wrapDiv.append("ul");
      for (var dp in dataProps){
        var hcode = d[dp];
        if (hcode > 0){
          ul.append("li")
            .text(viewConsts.hcodeText[hcode] + dataProps[dp])
            .classed(viewConsts.hcodeClass[hcode], true);
        }
      }
    }
  }

  /*
   * Checks if the query text (qText) fuzzily matches the baseText?
   */
  function fuzzyMatch(qText, baseText){
    match = baseText.match(qText)
    return match && match.length > 0;
    var qlen = qText.length,
        qpos = 0,
        match = true,
        mpos;
    while(qpos < qlen){
      mpos = baseText.indexOf(qText[qpos]);
      if (mpos < 0){
        match = false;
        break;
      }
      baseText = baseText.substring(mpos + 1);
      qpos++;
    }
    return match;
  }

  function keyDown(){
    // show text in the corner if not escape
    var inputTxtBox = document.getElementById("user-text"),
        keyCode = d3.event.keyCode;

    // remove hover summaries
    d3.selectAll("." + viewConsts.summaryClass).remove();

    if (document.activeElement.id !== inputTxtBox.id){
      inputTxtBox.value = "";
      inputTxtBox.focus();
    }
    if (keyCode == KEYCODES.UP || keyCode == KEYCODES.DOWN){
      d3.event.preventDefault();
    }
  }

  function textKeyUp(){
    var keyCode = d3.event.keyCode,
        inText,
        d3Ul = d3.select("#results-list"),
        arrowUp = keyCode == KEYCODES.UP,
        arrowDown = keyCode == KEYCODES.DOWN,
        enterPressed = keyCode == KEYCODES.ENTER,
        exactMatch = false;

    if ( arrowUp || arrowDown){
      // move text selection
      var lis = d3Ul.selectAll("li"),
          numLi = lis[0].length;
      if ( numLi > 1){
        d3Ul.select("." + viewConsts.selectedClass).classed(viewConsts.selectedClass, false);
        if (arrowUp){
          selNum = --selNum < 0 ? numLi-1 : selNum;
        } else if (arrowDown){
          selNum = ++selNum >= numLi ? 0 : selNum;
        }
        d3.select(lis[0][selNum]).classed(viewConsts.selectedClass, true);
        d3.event.preventDefault();
        return;
      }
    } else if (enterPressed){
      inText = d3Ul.select("." + viewConsts.selectedClass).text();
      d3Ul.selectAll(":not(." + viewConsts.selectedClass + ")").text("");
      this.value = " ";
      this.blur();
      exactMatch = true;
      // show over info for el
    } else{
      inText = this.value.toLowerCase();
    }

    var inTextLen = inText.length,
        fmatch,
        nshow = 0,
        d3this,
        movedSquare = false;
    // clear list
    d3Ul.html("");
    // fill list with top 3 fuzzy matches unless exactMatch is set
    if (inTextLen > 0){
      circles.each(function(d){
        d3this = d3.select(this);
        fmatch = exactMatch ? inText === d.name : fuzzyMatch(inText, d.name);
        if (fmatch){
          if (exactMatch && !movedSquare){
            insetState.pos = [d.lng, d.lat];
            redrawInset();
            movedSquare = true;
            showSummary(d, d3this);
          }
          d3this.attr("r", viewConsts.nodeR);
          if (nshow < 20){
            var li = d3Ul.append("li").text(d.name);
            if (nshow == 0){
              li.classed(viewConsts.selectedClass, true);
              selNum = 0;
            }
            nshow++;
          }
        } else{
          d.hidden = true;
          d3this.attr("r", 0);
        }
      });
      insetCircles.attr("r", function(d){
        return !d.hidden ? viewConsts.nodeRInset : 0;
      });
    } else{
      circles.each(function(d){
        d.hidden = false;
      });
      circles.attr("r", viewConsts.nodeR);
      insetCircles.attr("r", viewConsts.nodeRInset);
      this.blur();
    }
  }

  // helper function to convert: this string -> This String
  function toCapCase(str){
    var splitVals = str.split(/\s+/);
    for (var i in splitVals){
      splitVals[i] = splitVals[i][0].toUpperCase() + (splitVals[i].length > 1 ? splitVals[i].slice(1).toLowerCase() : "");
    }
    return splitVals.join(" ");
  }
})(window.d3, window.topojson);
