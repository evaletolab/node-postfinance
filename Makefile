test:
	expresso test/*.tests.js

checkamd:
	cat lib/check.js | sed 's/var check = exports;/define(function() {\nvar check = {};/' > check.js && echo "};" >> check.js

clean:
	rm -rf docs

docs:
	mkdir docs && dox -p --title "Daimyo - Samurai payment gateway integration for Node.js" lib/config.js lib/daimyo.js lib/authpost.js lib/xmlutils.js lib/check.js lib/error.js > docs/daimyo.html

.PHONY: test
