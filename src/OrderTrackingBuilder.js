import { CompactBuilderFactory, CompactBuilder } from "@nodable/compact-builder";

/**
 * Same shape as CompactBuilder's output, plus a side-channel recording the
 * insertion order of child tags per parent path (Map<parentPath, string[]>,
 * dot-notation paths matching Traverser's own path format).
 *
 * Needed because plain object key order isn't a reliable stand-in for
 * document order once repeated sibling tags collapse into one key backed by
 * an array — this fires once per tag in document order regardless.
 */
class OrderTrackingBuilder extends CompactBuilder {
    constructor(parserOptions, builderOptions, readonlyMatcher, registry) {
        super(parserOptions, builderOptions, readonlyMatcher, registry);
        this.siblingOrder = new Map();
    }

    addElement(tag) {
        // this.matcher already reflects the tag being opened (Xml2JsParser
        // pushes onto the matcher before addElement is called), so its path
        // string is "root.parent.child" — the parent path is everything
        // before the last segment.
        const jPath = this.matcher.toString();
        const lastDot = jPath.lastIndexOf(".");
        const parentPath = lastDot === -1 ? "" : jPath.substring(0, lastDot);
        if (!this.siblingOrder.has(parentPath)) this.siblingOrder.set(parentPath, []);
        const siblings = this.siblingOrder.get(parentPath);
        // Only push if not already recorded (repeated tags share one entry)
        if (siblings[siblings.length - 1] !== tag.name) siblings.push(tag.name);

        super.addElement(tag);
    }

    getOutput() {
        return { data: super.getOutput(), siblingOrder: this.siblingOrder };
    }
}

export class OrderTrackingBuilderFactory extends CompactBuilderFactory {
    getInstance(parserOptions, readonlyMatcher) {
        return new OrderTrackingBuilder(parserOptions, this.builderOptions, readonlyMatcher, this.registry);
    }
}
