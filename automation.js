(() => {
	if (document.readyState == "complete") setup()
	else window.addEventListener("load", setup)

	function setup() {
		$("[data-automate]").each((_, v) => {
			var qE = $(v)

			if (v.classList.contains("carousel-indicators")) {
				let slides = qE.parent().children(".carousel-inner").children()

				qE.html(slides.get().map((v, i) => `<li data-target="#${qE.parent()[0].id}" data-slide-to="${i}" class="${i == 0 ? "active" : ""}">`).join("\n"))
			} else if (v.classList.contains("carousel-inner")) {
				let sourceObject = window[v.dataset.automate]
				if (typeof sourceObject != "object" && !(sourceObject instanceof Array)) return console.error("Automate attr does not target a valid global object", v)
				let template = qE.html()



				qE.html(
					("data-save" in v.dataset && "connection" in navigator && navigator.connection.saveData === true
						? ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQIAdgB2AAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wgARCAAHADIDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAACAf/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAEekwKeGASBPwnn/8QAGxAAAgMAAwAAAAAAAAAAAAAABAYDBQcCFRb/2gAIAQEAAQUCiZcj5UJ7Jl05Ns1YZLZjmrkOm07Hj41hUOaKOA2dF6n/xAAUEQEAAAAAAAAAAAAAAAAAAAAg/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAg/9oACAECAQE/AX//xAApEAACAgECBAQHAAAAAAAAAAAEBQMGAgEHFBUWNQAIJDQREhMjJTZU/9oACAEBAAY/AqlO0wr+RyVeBmTX0icL6xrFVttYoYSGrUvZhWVzAu8jVvMoJrZdxqsac0OlcAMUIGOuT2YZOOPFgnKYpIMVQ08hju57XRIbAsOl0VrBOIqm4mq2xVzgFdcrSgWC6mV4fCWeppJGXxri8tZ6yWOdKsNVkHAz+YKR5OlhBkEXxCsNdqox8EDgQ2uzLVZLGrsTi85lYVfqjN01r75JFYKyXbClFQxS1PIEZmNzEdfXoUqmQ5fikhi5lpJVFMxzLNmPiuYx6RN20eVpFTvjTSKgisjaupMEVeJVGM7jLbHiZMVR9dFw66v60NUXqgrtIukzYFibWHMGRTVw5rxLlQnYH17bgoaINdW62rKNu0+4XA4ZMyzqU+SvCIttcIJ+Lsyh+DpJiRONMLcCs2GNl6X/AFnqBz077zsXMSOUdx/Idv4f33rP6fvfP4//xAAXEAEAAwAAAAAAAAAAAAAAAAABABAR/9oACAEBAAE/IdjxCad2jd/Vg7zE4rvqSRsfFWF3lMQDtaJ3WjKPVwkDWu4ZmWTSxVqFwcpXbq+fTIWb5UB//9oADAMBAAIAAwAAABCCQCf/xAAUEQEAAAAAAAAAAAAAAAAAAAAg/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAg/9oACAECAQE/EH//xAAVEAEBAAAAAAAAAAAAAAAAAAABEP/aAAgBAQABPxCigEUtyGV3N8IJw8ZkvCSU7xOfjxKYauybugL0THiCln3ittYld655ruWNBhRMmdeqjccf/9k="]
						: sourceObject)
						.map((v, i) => template.replace(/__SRC/g, v).replace(/__ACTIVE/g, i == 0 ? "active" : "")).join("\n")
				)
			} else {
				let source = eval(v.dataset.automate || [])
				if (typeof source != "object" && !(source instanceof Array)) return console.error("Automate attr does not return a valid array", v)
				let template = qE.html()

				qE.html(source.map(v => {
					var out = template
					v.forEach(v => {
						out = out.replace(v[0], v[1])
					})
					return out
				}).join("\n"))
			}
		})
	}
})()