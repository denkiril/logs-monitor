import { Component, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

interface InfoLog {
  // timeStr: string;
  time: number;
  totalMemory: number;
  usedMemory: number;
}

const DEFAULT_DATA: InfoLog[] = [
  {
    time: 68663,
    totalMemory: 44203776,
    usedMemory: 36407744,
  },
  {
    time: 68710,
    totalMemory: 44361152,
    usedMemory: 28145936,
  },
  {
    time: 68740,
    totalMemory: 44361152,
    usedMemory: 37661760,
  }
];

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements AfterViewInit, OnDestroy {
  private root?: am5.Root;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.updateChart();
  }

  ngOnDestroy(): void {
    this.zone.runOutsideAngular(() => this.root?.dispose());
  }

  onInputFileChange(ev: Event): void {
    // console.log('onInputFileChange', ev);
    const file = (ev.target as HTMLInputElement).files?.[0];
    console.log('onInputFileChange', file);

    if (!file) return;
    // const reader = new FileReader();
    // reader.onload = function() {
    //   const text = reader.result;
    //   console.log('text:', typeof text === 'string' ? text.length : typeof text);
    // };
    // reader.readAsText(file);
    this.parseFile(file);

  }

  private async parseFile(file: File): Promise<void> {
    const text = await file.text();
    console.log('text:', text.length);
    const lines = text.split('\n');
    console.log('lines:', lines.length);

    const infoLines = lines.filter(line => line.includes(' | INFO:'));
    console.log('infoLines:', infoLines.length);

    const infoLogs: InfoLog[] = infoLines.map(line => {
      const parts = line.split(' ').map(item => item.trim());
      const totalMemory = this.parseMemoryStr(parts[parts.length - 2]);
      const freeMemory = this.parseMemoryStr(parts[parts.length - 1]);

      return {
        time: this.parseTimeStr(parts[1]),
        totalMemory,
        usedMemory: totalMemory - freeMemory,
      };
    });
    console.log('infoLogs:', infoLogs);
    console.log('totalMemory > usedMemory always?', !infoLogs.some(log => log.usedMemory > log.totalMemory));
    this.updateChart(infoLogs);
  }

  private parseTimeStr(str: string): number {
    const parts = str.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);

    return h * 3600 + m * 60 + s;
  }

  private parseMemoryStr(str: string): number {
    return parseInt(str, 10);
  }

  private updateChart(infoLogs?: InfoLog[]): void {
    this.zone.runOutsideAngular(() => {
      this.root?.dispose();
      this.renderChart(infoLogs);
    });
  }

  private renderChart(infoLogs?: InfoLog[]): void {
    console.log('renderChart...');
    const root = am5.Root.new('chartdiv');
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panY: false,
        wheelY: "zoomX",
        layout: root.verticalLayout
      })
    );

    const baseTime = new Date().setHours(0, 0, 0, 0);
    console.log('baseTime', baseTime, new Date(baseTime));
    const data = (infoLogs || DEFAULT_DATA).map(item => ({
      ...item,
      time: (baseTime + item.time * 1000),
      date: new Date(baseTime + item.time * 1000),
    }));
    console.log('data:', data);

    // Create Y-axis
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        extraTooltipPrecision: 1,
        renderer: am5xy.AxisRendererY.new(root, {})
      })
    );

    // Create X-Axis
    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: 'second', count: 1 },
        renderer: am5xy.AxisRendererX.new(root, {}), // minGridDistance: 20
      })
    );
    // xAxis.data.setAll(data);
    xAxis.set("tooltip", am5.Tooltip.new(root, {
      themeTags: ["axis"],
    }));

    // Create series
    const createSeries = (name: string, field: string) => {
      const series = chart.series.push(
        // am5xy.ColumnSeries.new(root, {
        am5xy.LineSeries.new(root, {
          name: name,
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: field,
          valueXField: 'time',
          // stacked: true,
          // openValueYField: openField,
          // clustered: false,
          tooltip: am5.Tooltip.new(root, {}),
          connect: true,
        })
      );

      // series.columns.template.setAll({
      //   width: am5.percent(100),
      //   fillOpacity: 0.5,
      //   strokeWidth: 2,
      //   cornerRadiusTL: 5,
      //   cornerRadiusTR: 5,
      // });

      series.bullets.push(function() {
        return am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, {
            radius: 5,
            fill: series.get("fill")
          })
        });
      });
      series.strokes.template.set("strokeWidth", 2);
      // series.get("tooltip")?.label.set("text", "[bold]{name}[/]\n{valueX.formatDate('HH:mm:ss')}: {valueY}");
      series.get("tooltip")?.label.set("text", "[bold]{name}[/]\n{valueY}");

      series.data.setAll(data);
    }

    createSeries('totalMemory', 'totalMemory');
    createSeries('usedMemory', 'usedMemory');

    // Add legend
    const legend = chart.children.push(am5.Legend.new(root, {}));
    legend.data.setAll(chart.series.values);

    // Add cursor
    chart.set('cursor', am5xy.XYCursor.new(root, {}));

    this.root = root;
  }
}
