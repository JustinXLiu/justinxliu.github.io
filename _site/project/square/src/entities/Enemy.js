var Enemy = function (state, x, y, direction){
    Kiwi.GameObjects.Sprite.call(this, state, state.textures['enemy'], x, y);
	this.physics = this.components.add(new Kiwi.Components.ArcadePhysics(this, this.box));
    this.state = state;
    this.direction = direction;

    Enemy.prototype.update = function(){
        Kiwi.GameObjects.Sprite.prototype.update.call(this);
 		this.physics.update();
        this.move();

    }
    Enemy.prototype.move = function(){

        if(this.direction == 1){
            this.y += 5;
            if (this.y > this.game.height+50){
                this.destroy();
            }
        }
        else if(this.direction == 2){
            this.x -= 5;
            if (this.x < -50){
                this.destroy();
            }
        }else if(this.direction == 3){
            this.y -= 5;
            if (this.y < -50){
                this.destroy();
            }
        }else{
            this.x += 5;
            if (this.x > this.game.width+50){
                this.destroy();
            }

        }

    }

}
Kiwi.extend(Enemy,Kiwi.GameObjects.Sprite);
