import { event, keyBoardEvent } from '../event/core';
import { DFS, rotate, transform } from '../util/util';
import { Matrix } from '../render/core';
import Broadcast from './../Broadcast/Broadcast';
import { Composite } from './composite';


export class shapeConfig {
    // 位置
    pin: Array<number>; //*
    // 颜色
    color: string;
    // 是否填充
    fill: boolean;
    //透明度
    opacity: number;
    // 旋转
    rotate: number;
    // 形变
    transform: Array<Array<number>>;

    // event
    onClick: (e: event) => {};
    onMouseOver: (e: event) => {};
    onMouseOut: (e: event) => {};
    onMouseMove: (e: event) => {};
    onMouseDown: (e: event) => {};
    onMouseUp: (e: event) => {};
    onKeyPress: keyBoardEvent;

    // hook
    mounted: Function;
    removed: Function;
}



export class Base {
    protected _id: symbol;
    protected _type: string;
    protected _show: boolean;
    protected _mounted: Function;
    protected _removed: Function;

    protected isMount: boolean;

    protected writableProperties: Array<string>;
    protected readonlyProperties: Array<string>;
    protected readableProperties: Array<string>;
    // 保存更改后不用重新绘制路径的属性
    protected notRePathProperties: Array<string>;

    protected count: number;

    constructor(config: any, type: string) {
        this._id = Symbol();
        this._type = type;
        this._show = true;

        this.isMount = false;
        this.count = 1;

        this.writableProperties = [];
        this.readonlyProperties = ['id', 'type'];
        this.readableProperties = [];
    }
    
    // 初始化属性设置函数
    initSetter() {
        this.readableProperties = this.readableProperties.concat(this.readonlyProperties, this.writableProperties);

        this.writableProperties.map(attr => {
            let upperCaseAttr = attr.substring(0, 1).toUpperCase() + attr.substring(1);

            if(this[`set${upperCaseAttr}`] === undefined) {
                this[`set${upperCaseAttr}`] = function(val) {
                    this[`_${attr}`] = val;
                    
                    if(!this.notRePathProperties.includes(attr)) {
                        this.drawPath().rotatePath().transFormPath();
                    }
                }
            }
        });
    }

    // 属性get、set(暴露api)
    public attr(attr: string, val?: any): any | Base {
        if(!this.readableProperties.includes(attr)) {
            console.warn(`${attr}属性不存在`);
            return;
        }

        if(val !== undefined) {
            if(this.writableProperties.includes(attr)) {
                this[`set${attr.substring(0, 1).toUpperCase() + attr.substring(1)}`](val);
                this.isMount && Broadcast.notify('update');
            }
            else console.warn(`${attr}不能被修改`);

            return this;
        }
        else {
            return this[`_${attr}`];
        }
    }

    // 切换挂载状态
    toggleMount(isMount: boolean) {
        this.isMount = isMount;
        // 更改挂载状态后执行钩子函数
        isMount? this.mounted(): this.removed();

        if(this._type === 'Group' || this._type === 'Composite') {
            DFS(this.getShapeList(), item => {
                item.toggleMount(isMount);
            });
        }
    }


    // 返回图形数量
    getCount(): number { return this.count; }

    getShapeList() { return null; };

    // 需重载函数: 返回配置项
    config() {};



    /**------------------------- 状态钩子----------------------- */

    mounted() {
        if(this._mounted && typeof this._mounted === 'function') {
            this._mounted();
        } 
    }

    removed() {
        if(this._removed && typeof this._removed === 'function') {
            this._removed();
        }
    }


    /**-------------------------PATH-------------------------- */

    // 定义path2D路径(需重载)
    drawPath(): Base { return this; }

    // 旋转path2D路径(需重载)
    rotatePath(): Base { return this; }

    // 形变path2D路径(需重载)
    transFormPath(): Base { return this; }

    // 渲染图形到canvas(需重载)
    render(ctx: CanvasRenderingContext2D) {}
}




class eventInfo {
    eventName: string;
    fn: ((e: event) => {}) | keyBoardEvent;
}



// 图形基类
export class Shape extends Base {
    protected _x: number;
    protected _y: number;
    protected _center: Array<number>;
    protected _color: string;
    protected _fill: boolean;
    protected _opacity: number;
    protected _rotate: number;
    protected _transform: Array<Array<number>>;
    protected _fillRule: boolean;

    protected path: Path2D;
    protected camelCaseEventName;
    protected eventList: eventInfo[];

    // 鼠标是否在当前图形里面
    public isMouseIn: boolean;

    constructor(config: shapeConfig, type: string) {
        super(config, type);

        this._x = config.pin[0];
        this._y = config.pin[1];
        this._color = config.color;
        this._fill = (config.fill === undefined)? true: config.fill;
        this._opacity = config.opacity || 1;
        this._rotate = config.rotate || 0;
        this._transform = config.transform || [];
        this._mounted = config.mounted || (() => {});
        this._removed = config.removed || (() => {});
        this._fillRule = true;
        
        this.isMouseIn = false;
        this.eventList = [];
        this.camelCaseEventName = {};

        this.writableProperties = ['x', 'y', 'color', 'fill', 'opacity', 'rotate', 'transform', 'show'];
        this.readonlyProperties.push('center');

        this.notRePathProperties = ['color', 'fill', 'opacity', 'show'];

        // 保存config中声明的事件
        for(let prop in config) {
            if(/^on./g.test(prop)) {
                this.camelCaseEventName[prop] = config[prop];
                this.bind(prop.toLowerCase().substring(2), config[prop]);
            }
        }
    }

    // 获取基本属性
    protected getBaseConfig() {
        return {
            pin: [this._x, this._y],
            center: this._center,
            color: this._color,
            fill: this._fill,
            rotate: this._rotate,
            transform: this._transform,
            ...this.camelCaseEventName,

            // hook
            mounted: this._mounted,
            removed: this._removed
        };
    }

    /** ------------------------path---------------------- */

    getPath(): Path2D {
        return this.path;
    }

    setPath(path: Path2D) {
        this.path = path;
    }


    /**--------------------重载的setter-------------------- */

    // 重载setter（x）
    protected setX(x: number) {
        let d = x - this._x;
        this._x = x;
        this._center[0] = this._center[0] + d;

        this.drawPath().rotatePath().transFormPath();
    }

    // 重载setter（y）
    protected setY(y: number) {
        let d = y - this._y;
        this._y = y;
        this._center[1] = this._center[1] + d;

        this.drawPath().rotatePath().transFormPath();
    }

    /** -------------------事件---------------------------- */

    // 将事件绑定到canvas
    private addEvent(eventInfo: eventInfo[]) {
        eventInfo.map(item => {
            // 若是键盘事件数组
            if(item.fn instanceof Array) {
                item.fn.map(i => {
                    Broadcast.notify('add_event', {
                        shape: this,
                        eventName: item.eventName,
                        fn: i
                    });
                });
            }
            else {
                Broadcast.notify('add_event', {
                    shape: this,
                    eventName: item.eventName,
                    fn: item.fn
                });
            }
        });
    }

    // 将事件从canvas解绑
    private delEvent(shape: Shape | Composite) {
        Broadcast.notify('del_event', shape);
    }

    // 绑定事件，只有shape和composite类型有该方法(暴露api)
    public bind(event: string, fn: ((e: event) => {}) | keyBoardEvent) {
        // 改变事件回调函数的上下文为该图形（this = shape）
        if(event === 'keypress') {
            fn instanceof Array? 
            fn.map(item => item.fn = item.fn.bind(this)):
            (<keyBoardEvent>fn).fn = (<keyBoardEvent>fn).fn.bind(this)
        }
        else {
            fn = (<Function>fn).bind(this);
        } 
        
        // 若图形已经挂载在canvas上，则直接绑定事件
        if(this.isMount) {
            this.addEvent([{
                eventName: event,
                fn: fn
            }]);
        }
        
        // 将事件保存起来
        this.eventList.push({
            eventName: event,
            fn: fn
        });
    }

    // 获取该图形拥有的事件列表
    public getEventList(): eventInfo[] {
        return this.eventList;
    }

    /** -------------------动画---------------------------- */

    animate(o: Shape) {}
    start(fn: Function) {}
    end(fn: Function) {}


    /**------------------------- 状态钩子----------------------- */

    mounted() {
        // 图形挂载到canvas时，绑定事件
        this.addEvent(this.eventList);

        if(this._mounted && typeof this._mounted === 'function') {
            this._mounted();
        } 
    }

    removed() {
        // 图形从canvas移出时，解绑事件
        this.delEvent(this);

        if(this._removed && typeof this._removed === 'function') {
            this._removed();
        }
    }


    /** -------------------PATH2D路径---------------------------- */


    // 定义path2D路径(需重载)
    drawPath(shape?): Shape { return this; }

    // 旋转path2D路径
    rotatePath(shape?): Shape {
        // circle和ellipse不使用该方法
        if(this._type === 'circle' || this._type === 'ellipse') return this;

        let tPath = new Path2D();
        tPath.addPath(this.path, rotate(Matrix.rotateMatrix, this._center, this._rotate));
        this.path = tPath;

        return this;
    }

    // 形变path2D路径
    transFormPath(shape?): Shape {
        let tPath = new Path2D();
        tPath.addPath(this.path, transform(Matrix.transformMatrix, this._center, this._transform));
        this.path = tPath;

        return this;
    }

    // 渲染图形到canvas
    render(ctx: CanvasRenderingContext2D) {
        if(!this._show) return; 

        ctx.globalAlpha = this._opacity;

        if(this._fill) {
            ctx.fillStyle = this._color;
            ctx.fill(this.path, this._fillRule? 'nonzero': 'evenodd');
        }
        else {
            ctx.strokeStyle = this._color;
            ctx.stroke(this.path);
        }
    }
}