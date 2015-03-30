var Fighter = function(state, x, y){
    Kiwi.GameObjects.Sprite.call(this, state, state.textures['fighter'], x, y);
    this.state = state;
	this.physics = this.components.add(new Kiwi.Components.ArcadePhysics(this, this.box));
	
    Fighter.prototype.update = function(){
        Kiwi.GameObjects.Sprite.prototype.update.call(this);

    }

}

Kiwi.extend(Fighter,Kiwi.GameObjects.Sprite);