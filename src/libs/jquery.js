import $ from 'jquery';
export default $;

import 'jquery-mousewheel';

import {entries} from 'lodash-bound';

/* convenience static methods */
Object.assign($, {
	svg(creationString) {
		return this(`<svg>${creationString}</svg>`).children().detach();
	}
});

/* fix strange bug where case-sensitive attribute name is not used properly */
$.attrHooks['viewbox'] = {
	set: function(elem, value, name) {
		elem.setAttributeNS(null, 'viewBox', value + '');
		return value;
	}
};

/* a way to get the plain DOM element */
export function plainDOM() {
	return $(this)[0];
}

/**
 * Apply a set of json-encoded css rules to a jquery instance.
 * @this {$} a jquery instance to which to apply given rules
 * @param rules
 */
export function applyCSS(rules) {
	for (let [selector, css] of rules::entries()) {
		let context;
		if (selector.trim() === '&') {
			context = this;
		} else if (selector.trim().charAt(0) === '&') {
			context = this.find(selector.trim().substr(1).trim());
		} else {
			context = this.find(selector);
		}
		context.css(css);
	}
}
