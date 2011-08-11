test:
	expresso test/*.tests.js

clean:
	rm -rf docs

docs:
	mkdir docs && dox -p --title "Daimyo - Samurai payment gateway integration for Node.js" lib/config.js lib/daimyo.js lib/authpost.js lib/xmlutils.js lib/check.js lib/error.js > docs/daimyo.html

.PHONY: test
