import packageValue from "example-package";
import packageIcon from "example-package/icon.svg";
import scopedValue from "@scope/library";
import scopedIcon from "@scope/library/icon.svg";
import { sharedValue } from "./shared.js";

Drupal.behaviors.catalog = {
  attach(context) {
    context.querySelectorAll(".catalog").forEach((element) => {
      element.dataset.packages = `${packageValue}:${scopedValue}:${sharedValue}`;
      element.dataset.icon = packageIcon;
      element.dataset.scopedIcon = scopedIcon;
    });
    Drupal.t("Catalog loaded");
  },
};
