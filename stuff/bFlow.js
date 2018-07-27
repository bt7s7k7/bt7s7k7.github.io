FL = {
	repeat: function* (number) {
		for (var i = 0; i < number; i++) {
			yield [i, number]
		}
	},
	forEach: function* (array) {
		for (var i = 0; i < array.length; i++) {
			yield [array[i], i, array]
		}
	}
}