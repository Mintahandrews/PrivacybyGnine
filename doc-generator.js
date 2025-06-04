import { Document, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import fs from 'fs';
import { Packer } from 'docx';

// Create a new document
const doc = new Document({
  creator: "PrivacyGnine Team",
  description: "Comprehensive documentation of the PrivacyGnine application",
  title: "PrivacyGnine Documentation"
});

// Add title page
doc.addSection({
  children: [
    new Paragraph({
      text: "PrivacyGnine Application",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 4000,
        after: 500,
      },
    }),
    new Paragraph({
      text: "Comprehensive Documentation",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: `Generated on ${new Date().toLocaleDateString()}`,
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 500,
      },
    }),
  ],
});

// Add table of contents section
doc.addSection({
  children: [
    new Paragraph({
      text: "Table of Contents",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "Part 1: Introduction and Overview",
    }),
    new Paragraph({
      text: "Part 2: System Architecture",
    }),
    new Paragraph({
      text: "Part 3: Frontend Implementation",
    }),
    new Paragraph({
      text: "Part 4: Machine Learning Core: Autoencoder Model",
    }),
    new Paragraph({
      text: "Part 5: Privacy Filters Implementation",
    }),
    new Paragraph({
      text: "Part 6: Circular Area Selection",
    }),
    new Paragraph({
      text: "Part 7: Image Processing Pipeline",
    }),
    new Paragraph({
      text: "Part 8: TensorFlow.js Integration",
    }),
    new Paragraph({
      text: "Part 9: Performance Optimization",
    }),
    new Paragraph({
      text: "Part 10: User Interface and Experience",
    }),
    new Paragraph({
      text: "Part 11: Security and Privacy Considerations",
    }),
    new Paragraph({
      text: "Part 12: Future Enhancements",
    }),
  ],
});

// Part 1: Introduction and Overview
doc.addSection({
  children: [
    new Paragraph({
      text: "Part 1: Introduction and Overview",
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      text: "PrivacyGnine is a browser-based image anonymization tool designed to protect users' privacy by applying AI-powered filters to sensitive parts of images. The application processes images entirely on the client side, ensuring that no data leaves the user's device.",
    }),
    new Paragraph({
      text: "Key Features",
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph({
      text: "• Browser-based privacy filtering with no server-side processing",
    }),
    new Paragraph({
      text: "• Multiple filter types for different privacy needs (Basic, Edge Enhance, Gaussian, Pixelate, Color Quantize)",
    }),
    new Paragraph({
      text: "• On-device machine learning using TensorFlow.js",
    }),
    new Paragraph({
      text: "• Manual selection of specific areas for privacy protection",
    }),
    new Paragraph({
      text: "• Adjustable privacy level for fine-tuned control",
    }),
    new Paragraph({
      text: "• Simple and intuitive user interface",
    }),
    new Paragraph({
      text: "• Works completely offline after initial load",
    }),
    new Paragraph({
      text: "Target Audience",
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph({
      text: "• Individuals wanting to protect their privacy when sharing images online",
    }),
    new Paragraph({
      text: "• Organizations dealing with sensitive visual information",
    }),
    new Paragraph({
      text: "• Developers looking for privacy-first image processing solutions",
    }),
    new Paragraph({
      text: "• Privacy advocates and security professionals",
    }),
    new Paragraph({
      text: "Presentation Guidelines",
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph({
      text: "When presenting this section, demonstrate the application's main interface and show how to upload and process an image with the default settings. Emphasize the privacy-first approach and the fact that all processing happens locally in the browser.",
    }),
  ],
});

// Save the document
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("PrivacyGnine_Documentation.docx", buffer);
  console.log("Documentation created successfully!");
});

