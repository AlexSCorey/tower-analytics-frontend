import PropTypes from 'prop-types';
import React, { Component } from 'react';
import * as d3 from 'd3';
import initializeChart from './BaseChart';

class Tooltip {
    constructor(props) {
        this.svg = props.svg;
        this.draw();
    }

    draw() {
        this.width = 125;
        this.toolTipBase = d3.select(this.svg + '> svg').append('g');
        this.toolTipBase.attr('id', 'svg-chart-Tooltip.base-' + this.svg.slice(1));
        this.toolTipBase.attr('overflow', 'visible');
        this.toolTipBase.style('opacity', 0);
        this.toolTipBase.style('pointer-events', 'none');
        this.toolTipBase.attr('transform', 'translate(100, 100)');
        this.boxWidth = 125;
        this.textWidthThreshold = 20;

        this.toolTipPoint = this.toolTipBase
        .append('rect')
        .attr('transform', 'translate(10, -10) rotate(45)')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', 20)
        .attr('width', 20)
        .attr('fill', '#393f44');
        this.boundingBox = this.toolTipBase
        .append('rect')
        .attr('x', 10)
        .attr('y', -23)
        .attr('rx', 2)
        .attr('height', 52)
        .attr('width', this.boxWidth)
        .attr('fill', '#393f44');
        this.savings = this.toolTipBase
        .append('text')
        .attr('x', 20)
        .attr('y', 16)
        .attr('font-size', 12)
        .attr('fill', 'white')
        .text('Savings $0');
        this.name = this.toolTipBase
        .append('text')
        .attr('fill', 'white')
        .attr('font-size', 12)
        .attr('x', 20)
        .attr('y', -2)
        .text('Unknown');
    }

    handleMouseOver = d => {
        let name;
        let savings;
        const x =
            d3.event.pageX -
            d3
            .select(this.svg)
            .node()
            .getBoundingClientRect().x +
            10;
        const y =
            d3.event.pageY -
            d3
            .select(this.svg)
            .node()
            .getBoundingClientRect().y -
            10;
        if (!d) {
            return;
        } else {
            savings = d.savings.toFixed(2).toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            name = d.name;
        }

        const toolTipWidth = this.toolTipBase.node().getBoundingClientRect().width;
        const chartWidth = d3
        .select(this.svg + '> svg')
        .node()
        .getBoundingClientRect().width;
        const overflow = 100 - (toolTipWidth / chartWidth) * 100;
        const flipped = overflow < (x / chartWidth) * 100;
        this.name.text('' + name);
        this.savings.text('Savings $' + savings);
        this.nameWidth = this.name.node().getComputedTextLength();

        const maxTextPerc = this.nameWidth / this.boxWidth * 100;
        const threshold = 85;
        const overage = maxTextPerc / threshold;
        let adjustedWidth;
        if (maxTextPerc > threshold) {
            adjustedWidth = this.boxWidth * overage;
        } else {
            adjustedWidth = this.boxWidth;
        }

        this.boundingBox.attr('width', adjustedWidth);
        this.toolTipBase.attr('transform', 'translate(' + x + ',' + y + ')');
        if (flipped) {
            this.toolTipPoint.attr('transform', 'translate(-20, -10) rotate(45)');
            this.boundingBox.attr('x', -adjustedWidth - 20);
            this.name.attr('x', -(toolTipWidth - 7));
            this.savings.attr('x', -(toolTipWidth - 7));
        } else {
            this.toolTipPoint.attr('transform', 'translate(10, -10) rotate(45)');
            this.boundingBox.attr('x', 10);
            this.name.attr('x', 20);
            this.savings.attr('x', 20);
        }

        this.toolTipBase.style('opacity', 1);
        this.toolTipBase.interrupt();
    };

    handleMouseOut = () => {
        this.toolTipBase
        .transition()
        .delay(15)
        .style('opacity', 0)
        .style('pointer-events', 'none');
    };
}

class TopTemplatesSavings extends Component {
    constructor(props) {
        super(props);
        this.init = this.init.bind(this);
        this.draw = this.draw.bind(this);
        this.resize = this.resize.bind(this);
        this.state = {
            timeout: null
        };
    }

    // Methods
    resize() {
        const { timeout } = this.state;
        clearTimeout(timeout);
        this.setState({
            timeout: setTimeout(() => {
                this.init();
            }, 500)
        });
    }

    init() {
        this.draw();
    }

    draw() {
        // Use PF chart colors
        const color = d3.scaleOrdinal([ '#F0AB00', '#0066CC' ]);
        // Clear our chart container element first
        d3.selectAll('#' + this.props.id + ' > *').remove();
        let { data: unfiltered, selected } = this.props;
        const data = unfiltered.filter(({ id }) => !selected.includes(id));
        data.forEach(datum => {
            datum.calculations.forEach(row => {
                row.savings = datum.delta;
                row.name = datum.name;
            });
        });
        const width = this.props.getWidth();
        const height = this.props.getHeight();
        const x0 = d3
        .scaleBand()
        .range([ 0, width ])
        .padding(0.45);
        // x scale of individual grouped bars
        const x1 = d3.scaleBand();
        const y = d3.scaleLinear().range([ height, 0 ]);
        // format our X Axis ticks
        let ticks;
        ticks = data.map(d => d.name);

        const xAxis = d3.axisBottom(x0).tickValues(ticks);

        const yAxis = d3
        .axisLeft(y)
        .ticks(8)
        .tickSize(-width, 0, 0);

        const svg = d3
        .select('#' + this.props.id)
        .append('svg')
        .attr('width', width + this.props.margin.left + this.props.margin.right)
        .attr('height', height + this.props.margin.bottom + this.props.margin.top)
        .append('g')
        .attr(
            'transform',
            'translate(' +
          this.props.margin.left +
          ',' +
          this.props.margin.top +
          ')'
        );

        const dates = data.map(d => d.name);
        const taskTypes = data[0].calculations.map(d => d.type);
        const tooltip = new Tooltip({
            svg: '#' + this.props.id
        });
        x0.domain(dates);
        x1.domain(taskTypes).range([ 0, x0.bandwidth() ]); // unsorted
        y.domain([
            0,
            d3.max(data, date => d3.max(date.calculations, d => d.total * 1.15)) || 8
        ]);

        // add y axis
        svg
        .append('g')
        .attr('class', 'y axis')
        .call(yAxis)
        .selectAll('line')
        .attr('stroke', '#d7d7d7')
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '.71em')
        .style('text-anchor', 'end')
        .style('font-weight', 'bold')
        .text('Value');
        svg
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - this.props.margin.left)
        .attr('x', 0 - height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Automation time (seconds)');

        // add x axis
        svg
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'start')
        .attr('dx', '0.75em')
        .attr('dy', -x0.bandwidth() / 1.45 - 5)
        .attr('transform', 'rotate(-90)');

        svg.selectAll('.x-axis line').attr('stroke', 'transparent');
        svg
        .append('text')
        .attr(
            'transform',
            'translate(' +
          width / 2 +
          ' ,' +
          (height + this.props.margin.top + 45) +
          ')'
        )
        .style('text-anchor', 'middle')
        .text('Templates');

        // add the groups
        let slice = svg.selectAll('.slice').data(data);
        slice.exit().remove();

        const enter = slice
        .enter()
        .append('g')
        .attr('transform', d => 'translate(' + x0(d.name) + ',0)');
        slice = slice.merge(enter);
        // add the individual bars
        let bars = slice.selectAll('rect').data(function(d) {
            return d.calculations;
        });
        bars.exit().remove();
        const subEnter = bars
        .enter()
        .append('rect')
        .attr('width', x1.bandwidth())
        .attr('x', function(d) {
            return x1(d.type);
        }) // unsorted
        .style('fill', function(d) {
            return color(d.type);
        })
        .attr('y', function(d) {
            return y(d.total);
        })
        .attr('height', function(d) {
            return height - y(d.total);
        })
        .on('mouseover', function(d) {
            d3.select(this).style('fill', d3.rgb(color(d.type)).darker(1));
            tooltip.handleMouseOver(d);
        })
        .on('mousemove', tooltip.handleMouseOver)
        .on('mouseout', function(d) {
            d3.select(this).style('fill', color(d.type));
            tooltip.handleMouseOut();
        });
        bars = bars.merge(subEnter);

        //Legend
        let legend = svg.selectAll('.legend')
        .data(data[0].calculations.map(row => row.type).reverse())
        .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', function (d, i) { return 'translate(' + -(i + 1) * 90 + ', ' + (height + 25) + ')'; });

        legend.append('rect')
        .attr('x', width - 15)
        .attr('width', 15)
        .attr('height', 15)
        .style('fill', function (d) { return color(d); });

        legend.append('text')
        .attr('x', width + 5)
        .attr('y', 7.5)
        .attr('dy', '.35em')
        .style('font-size', '14px')
        .text(function (d) { return d; });
    }

    componentDidMount() {
        this.init();
        // Call the resize function whenever a resize event occurs
        window.addEventListener('resize', this.resize);
    }

    componentWillUnmount() {
        const { timeout } = this.state;
        clearTimeout(timeout);
        window.removeEventListener('resize', this.resize);
    }

    componentDidUpdate() {
        this.init();
    }

    render() {
        return <div id={ this.props.id } />;
    }
}

TopTemplatesSavings.propTypes = {
    id: PropTypes.string,
    data: PropTypes.array,
    selected: PropTypes.array,
    margin: PropTypes.object,
    getHeight: PropTypes.func,
    getWidth: PropTypes.func
};

export default initializeChart(TopTemplatesSavings);