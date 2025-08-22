export default {
  styles: {
    CodeSurfer: {
      pre: {
        color: "#d4d4d4",
        backgroundColor: "#1e1e1e"
      },
      code: {
        color: "#d4d4d4",
        backgroundColor: "#1e1e1e"
      },
      tokens: {

        "comment prolog doctype cdata": {
          color: "#6a9955"
        },

        "punctuation": {
          color: "#d4d4d4"
        },

        "property tag boolean number constant symbol deleted": {
          color: "#b5cea8"
        },

        "selector attr-name string char builtin inserted": {
          color: "#ce9178"
        },

        "operator entity url": {
          color: "#d4d4d4",
          background: "#1e1e1e"
        },

        "atrule attr-value keyword": {
          color: "#c586c0"
        },

        "function": {
          color: "#dcdcaa"
        },

        "regex important variable": {
          color: "#d16969"
        },

        "important bold": {
          fontWeight: "bold"
        },

        "italic": {
          fontStyle: "italic"
        },

        "constant": {
          color: "#9CDCFE"
        },

        "class-name": {
          color: "#4EC9B0"
        },

        "parameter": {
          color: "#9CDCFE"
        },

        "interpolation": {
          color: "#9CDCFE"
        },

        "punctuation.interpolation-punctuation": {
          color: "#569cd6"
        },

        "boolean": {
          color: "#569cd6"
        },

        "property": {
          color: "#9cdcfe"
        },

        "selector": {
          color: "#d7ba7d"
        },

        "tag": {
          color: "#569cd6"
        },

        "attr-name": {
          color: "#9cdcfe"
        },

        "attr-value": {
          color: "#ce9178"
        },

        "entity": {
          color: "#4ec9b0",
          cursor: "unset"
        },

        "namespace": {
          color: "#4ec9b0"
        }

      },
      title: {
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4"
      },
      subtitle: {
        color: "#d6deeb",
        backgroundColor: "rgba(10,10,10,0.9)"
      },
      unfocused: {
        // only the opacity of unfocused code can be changed
        opacity: 0.4
      }
    }
  }
};