import { Shape, shapeConfig } from './BaseShape';
import { line } from './Line';


class rectangleConfig extends shapeConfig {
    edge: Array<number>; //*
}


//绘制矩形
export class Rectangle extends Shape {
    private _width: number;
    private _height: number;

    constructor(config: rectangleConfig) {
        super(config, 'Rectangle');

        this._width = config.edge[0];
        this._height = config.edge[1];
        this._center = [this._x + this._width/2, this._y + this._height/2];

        this.writableProperties.push('width');
        this.writableProperties.push('height');

        this.initSetter();
        this.drawPath().rotatePath().transFormPath();
    }

    config() {
        return {
            ...this.getBaseConfig(),
            edge: [this._width, this._height]
        };
    }

    drawPath(): Shape {
        this.path = new Path2D();
        line
        .init(this.path, [this._x, this._y])
        .bee([[this._width, 0], [this._width, this._height], [0, this._height], [0, 0]])
        .end();
        return this;
    }
} 