# How the Link Feature Works for Layers

## Overview

The **Link** feature allows you to connect two or more layers together so they move, scale, and rotate as a single unit. This is useful when you want to keep elements like a logo and text together, or maintain relative positioning between multiple elements.

## How It Works - Simple & Intuitive

### 1. **Linking Layers**

**Super Simple Process:**
1. Select a layer (click on it in the layers panel)
2. Click the **🔗 Link** button
3. The system automatically finds another unlinked layer and links them together
4. Both layers now move, scale, and rotate together!

**That's it!** No complex multi-select or confusing steps.

### 2. **What Happens When Layers Are Linked**

When layers share the same `groupId`, they behave as a group:

#### **Position (xNorm, yNorm)**
- When you drag one layer, all linked layers move together
- The relative positions between linked layers are preserved
- Example: If Layer A is at (0.5, 0.3) and Layer B is at (0.5, 0.7), and you drag Layer A to (0.6, 0.4), Layer B will move to (0.6, 0.8) maintaining the same vertical offset

#### **Scale**
- When you resize one layer, all linked layers scale proportionally
- Each layer maintains its relative size compared to others in the group

#### **Rotation**
- When you rotate one layer, all linked layers rotate by the same amount
- The relative rotation between layers is preserved

### 3. **Code Implementation**

The grouping logic is in `DraggablePreviewCanvas.tsx`:

```typescript
// When a layer is dragged
if (groupId) {
  // Find all other layers in the same group
  normalizedLayers
    .filter(l => l.groupId === groupId && l.id !== layer.id)
    .forEach(groupLayer => {
      // Calculate new position maintaining relative offset
      const groupX = node.x() + (groupLayer.xNorm - layer.xNorm) * image.width;
      const groupY = node.y() + (groupLayer.yNorm - layer.yNorm) * image.height;
      // Update the linked layer
      onLayerUpdate({ ...groupLayer, xNorm, yNorm });
    });
}

// When a layer is resized/rotated
if (groupId) {
  normalizedLayers
    .filter(l => l.groupId === groupId && l.id !== layer.id)
    .forEach(groupLayer => {
      // Apply same scale and rotation changes
      onLayerUpdate({
        ...groupLayer,
        scale: groupLayer.scale * scaleX,
        rotation: groupLayer.rotation + rotationDelta
      });
    });
}
```

### 4. **Unlinking Layers**

Click **🔗 Unlink** on a linked layer to:
- Remove the link from that layer
- The layer becomes independent again
- Other layers in the group remain linked together

### 5. **Visual Indicators**

- **Linked layers** show:
  - A 🔗 icon next to the layer name in the list
  - An orange **🔗 Unlink** button when selected
- **Unlinked layers** show:
  - A blue **🔗 Link** button when selected
- The button appears in the layer panel below the layer controls

## Use Cases

1. **Logo + Text Together**: Link a logo and company name so they always move together
2. **Multi-Element Watermarks**: Keep multiple text lines or graphics aligned
3. **Complex Branding**: Maintain spacing between logo, tagline, and website URL
4. **Consistent Positioning**: Ensure elements stay in the same relative positions across different images

## How to Use

### Linking Two Layers
1. Select the first layer
2. Click **🔗 Link** button
3. Done! It automatically links with another available layer

### Linking More Layers
- After linking two layers, you can link a third layer to the same group by:
  1. Select the third layer
  2. Click **🔗 Link** button
  3. It will link with one of the already-linked layers

### Unlinking
- Click **🔗 Unlink** on any linked layer to remove it from the group

## Technical Details

- **Storage**: `groupId` is stored in the `WatermarkLayer` type
- **Persistence**: Linked groups are saved with your design
- **Normalized Coordinates**: All position calculations use normalized coordinates (0-1) for consistency across image sizes

