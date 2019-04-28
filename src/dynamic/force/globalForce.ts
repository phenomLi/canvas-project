import { vector, Vector } from "../../math/vector";
import { Body } from "../body/body";



// 作用力发生器
export default class ForceGenerator {
    protected force: vector;
    
    constructor(force?: vector) {
        this.force = force;
    }

    apply(body: Body): vector | number | void {
        throw '此方法必须由子类重写';
    }
}  





/**
 * 全局作用力，作用在每一个刚体上
 * */ 


// 重力发生器
export class Gravity extends ForceGenerator {
    constructor(g: vector) {
        super(g);
    }

    apply(body: Body): vector {
        return Vector.scl(body.mass*0.06, this.force);
    }
}

/**
 * 线速度阻力发生器
 * k1, k2分别为阻力系数
 *  */
export class LinearDrag extends ForceGenerator {
    private k1: number;
    private k2: number;

    constructor(k1: number, k2: number) {
        super();

        this.k1 = k1;
        this.k2 = k2;
    }

    apply(body: Body): vector {
        let len = Vector.len(body.linearVel),
            drag = this.k1*len + this.k2*len*len;

        return Vector.scl(-drag, Vector.nol(body.linearVel));
    }
}



export class AngularDrag extends ForceGenerator {
    private k: number;

    constructor(k: number) {
        super();

        this.k = k;
    }

    apply(body: Body) {
        body.angularVel *= (1 - this.k);
    }
}





