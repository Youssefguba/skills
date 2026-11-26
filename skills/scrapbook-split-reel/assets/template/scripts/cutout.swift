// Lifts the main subject out of an image with Apple's Vision framework (macOS 14+), no model download.
// For topic objects only (a phone, a product shot). Never use it on people or on frames of the speaker.
// Usage: swift cutout.swift <input-image> <output.png> [instance-number]
// With no instance number every subject is kept; 1, 2, ... keeps one, ordered left to right.
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count >= 3, let input = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
    print("usage: cutout.swift <input-image> <output.png> [instance-number]")
    exit(1)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: input)
try handler.perform([request])
guard let result = request.results?.first else {
    print("no subject found")
    exit(2)
}

// Order instances by the horizontal centre of their mask.
func centreX(_ instance: Int) throws -> CGFloat {
    let mask = try result.generateScaledMaskForImage(forInstances: IndexSet(integer: instance), from: handler)
    let image = CIImage(cvPixelBuffer: mask)
    let filter = CIFilter(name: "CIAreaAverage")!
    filter.setValue(image, forKey: kCIInputImageKey)
    filter.setValue(CIVector(cgRect: image.extent), forKey: "inputExtent")
    let width = Int(image.extent.width)
    var best: CGFloat = 0, weight: CGFloat = 0
    let context = CIContext()
    for column in stride(from: 0, to: width, by: max(1, width / 64)) {
        let strip = CGRect(x: CGFloat(column), y: 0, width: 1, height: image.extent.height)
        filter.setValue(CIVector(cgRect: strip), forKey: "inputExtent")
        var pixel = [UInt8](repeating: 0, count: 4)
        context.render(filter.outputImage!, toBitmap: &pixel, rowBytes: 4, bounds: CGRect(x: 0, y: 0, width: 1, height: 1), format: .RGBA8, colorSpace: nil)
        best += CGFloat(column) * CGFloat(pixel[0])
        weight += CGFloat(pixel[0])
    }
    return weight > 0 ? best / weight : 0
}

var instances = result.allInstances
if args.count >= 4, let wanted = Int(args[3]) {
    let ordered = try instances.sorted { try centreX($0) < centreX($1) }
    guard wanted >= 1, wanted <= ordered.count else {
        print("found \(ordered.count) subject(s)")
        exit(3)
    }
    instances = IndexSet(integer: ordered[wanted - 1])
}

let buffer = try result.generateMaskedImage(ofInstances: instances, from: handler, croppedToInstancesExtent: true)
let context = CIContext()
let output = CIImage(cvPixelBuffer: buffer)
try context.writePNGRepresentation(of: output, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("wrote \(args[2]) with \(result.allInstances.count) subject(s) detected")
