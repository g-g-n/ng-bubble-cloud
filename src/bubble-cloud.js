angular.module('bubbleCloud', [])

.directive('bubbleCloud', function () {

    return {

        restrict: 'E',

        scope: {

            // Either an array of data objects (with groups, labels, and values),
            // or a dictionary of groups of data objects (with labels and values)
            data: '=',

            // Set to 'true' to automatically update when data does
            watch: '@',

            // The attribute containing a data object's value
            valueAttr: '@',

            // The attribute containing a data object's label (optional)
            labelAttr: '@',

            // The attribute containing a data object's group
            // (required if data is an array)
            groupAttr: '@',

            // A function which takes a group name and returns the desired
            // fill color. Optional. The default is d3.scale.category20c()
            fillColorFn: '@',

            // A function which takes a group name and returns the desired
            // label color. Optional. The default is black.
            labelColorFn: '@',

            // Overall diameter of the chart, in pixels
            diameter: '@',

            // A function name to publish into the parent scope, to allow
            // reloading the chart (optional)
            renderChartFn: '=?',

	    // A function which allows to provide the custom tooltip
	    toolTipFn: '@',

        },

        link: function (scope, element, attrs, ctrl) {

            // Set size of element
            element.css('height', scope.diameter + 'px');

            // Publish renderChart into the parent scope
            scope.renderChartFn = ctrl.renderChart;

            // Watch the data, if desired
            if (scope.watch === 'true') {
                scope.$watch('data', ctrl.renderChart, true);
            }

            // Set up the controller
            ctrl.init(element.find('svg'));

            // Render the chart
            ctrl.renderChart();
        },

        template: '<svg id="mychart"></svg>',

        controller: 'chartController',

    };

})

.controller('chartController', function ($scope) {

    // Return a flattened array of objects of this form:
    //
    //   { group: 'Rock', name: 'Rolling Stones, The', value: 12 }
    //
    function get_flattened_data () {

        var data = $scope.data;

        if (_(data).isArray()) {

            var groupAttr = $scope.groupAttr;
            if (! groupAttr) throw new Error('group-attr is required on <bubble>');

            data = _($scope.data).groupBy(function (item) { return item[groupAttr]; });
        }

        var flattened_data = [];

        _(data).each(function (items, group) {

            _(items).each(function (item) {
                flattened_data.push({ group: group, object: item });
            });

        });

        return flattened_data;

    }
/*
    function tool_tip_function(datum) {
        return datum.object[labelAttr] + ': ' + label_format_fn(datum.object[valueAttr]);
    };
*/
    // Initialize the controller with the given SVG element
    // (wrapped in an array)
    this.init = function (svg_element) {

        var valueAttr = $scope.valueAttr;
        if (! valueAttr) throw new Error('value-attr is required on <bubble>');

        var diameter = parseInt($scope.diameter);

        svg_element
            .attr('width', diameter)
            .attr('height', diameter)
            .attr('class', 'bubble');

        $scope.selection = d3.selectAll(svg_element);

        // Create a pack layout
        $scope.pack_layout = d3.layout.pack()
            .sort(null)
            .value(function (datum) {
                return datum.object[valueAttr];
            })
            .size([diameter, diameter])
            .padding(1.5);

        if ($scope.fillColorFn) {
            var fillColorFn = $scope.$parent[$scope.fillColorFn];
            if (! _(fillColorFn).isFunction())
                throw new Error('fill-color-fn attr must be a function in the parent scope');
            $scope.fill_color_fn = fillColorFn;
        } else {
            $scope.fill_color_fn = d3.scale.category20c();
        }

        if ($scope.labelColorFn) {
            var labelColorFn = $scope.$parent[$scope.labelColorFn];
            if (! _(labelColorFn).isFunction())
                throw new Error('label-color-fn attr must be a function in the parent scope');
            $scope.label_color_fn = labelColorFn;
        } else {
            $scope.label_color_fn = function () { return 'black'; };
        }

        if ($scope.toolTipFn) {
            var toolTipFn = $scope.$parent[$scope.toolTipFn];
            if (! _(toolTipFn).isFunction())
                throw new Error('tool-tip-fn attr must be a function in the parent scope');
            $scope.tool_tip_fn = toolTipFn;
        } 

        $scope.label_format_fn = d3.format(',d');
    };

    // Get the latest data and render the chart
    this.renderChart = function () {

        // Get the latest data

        var data = { children: get_flattened_data() };

        // Lay out the data

        var node = $scope.selection.selectAll('.node')
            .data($scope.pack_layout.nodes(data).filter(function(d) { return !d.children; }));

        // Handle added nodes

        var enter = node.enter().append('g')
            .attr('class', 'node');
        enter.append('title');
        enter.append('circle');
        enter.append('text')
            .attr('dy', '.3em')
            .style('text-anchor', 'middle')

        // Handle each node

        var valueAttr = $scope.valueAttr;
        var labelAttr = $scope.labelAttr;
        var label_format_fn = $scope.label_format_fn;
        var fill_color_fn = $scope.fill_color_fn;
        var label_color_fn = $scope.label_color_fn;
        var tool_tip_fn = $scope.tool_tip_fn;

        node.attr('transform', function (datum) {
            return 'translate(' + datum.x + ',' + datum.y + ')';
        });

        node.select('title')
            .text(function (datum) {
                //return datum.object[labelAttr] + ': ' + label_format_fn(datum.object[valueAttr]);
                return tool_tip_fn(datum);
            });

        node.select('circle')
            .attr('r', function (datum) {
                return datum.r;
            })
            .style('fill', function (datum) {
                return fill_color_fn(datum.group);
            });

        node.select('text')
            .style('fill', function (datum) {
                return label_color_fn(datum.group);
            })
            .text(function (datum) {
                var label = datum.object[labelAttr];
                return label ? label.substring(0, datum.r / 3) : '';
            });

        // Handle removed nodes

        node.exit().remove();
    };

})

;
