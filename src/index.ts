import { defineRules } from "./core";

defineRules([
  {
    name: "Remove starred items",
    type: "hide",
    selector: ".i-twemoji-star",
    continuous: true,
    batchSize: 100,
    pollingInterval: 100,
    maxRetries: 50,
  },
  {
    name: "Remove sidebar card",
    type: "hide",
    selector: ".bg-\\$vp-c-bg.hover\\:bg-\\$vp-c-bg\\/40",
  },
  {
    name: "Remove page feedback button",
    type: "hide",
    selector: "button.bg-\\$vp-c-default-soft",
  },
  {
    name: "Remove features page in homepage",
    type: "hide",
    selector: ".VPFeatures",
  },
  {
    name: "Remove features intro text in homepage",
    type: "hide",
    selector: "p.text-center.text-lg.text-text-2.mb-2",
  },
  {
    name: "Remove alternate buttons in homepage",
    type: "hide",
    selector: "a.VPButton.medium.alt",
  },
  {
    name: "Remove announcement pill in homepage",
    type: "hide",
    selector: "a.mb-3.inline-flex.items-center.rounded-lg",
  },
  {
    name: "Remove readingpiracyguide tags",
    type: "text",
    selector: "li",
    textToRemove: "Books / Comics / Educational /",
  },
]);
