test:
	expresso test/*.tests.js

checkamd:
	cat lib/check.js | sed 's/var check = exports;/define(function() {\nvar check = {};/' > check-`cat VERSION`.js && echo -e "\n\nreturn check;\n\n});" >> check-`cat VERSION`.js

clean:
	rm -rf docs

angular:
	uglifyjs support/js/*.js > "angular-postfinance-`cat VERSION`.min.js"

docs:
	mkdir docs && dox -p --title "Postfinance API documentation" -i GETTING_STARTED.mkd lib/config.js lib/postfinance.js lib/transaction.js support/ashigaru.js lib/check.js lib/xmlutils.js lib/authpost.js lib/ducttape.js lib/messages.js lib/error.js > docs/postfinance.html

.PHONY: test
