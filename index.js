const { StateActuator } = require("./lib/actuator");

// Don't import stuff from the view-framework (e.g. "/react") folders here
// because we don't want to force those dependencies to be installed.
// Those folders have their own index of exports.
module.exports = { StateActuator };
