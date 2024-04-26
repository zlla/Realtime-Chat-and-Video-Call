using Microsoft.AspNetCore.Mvc;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImageController : ControllerBase
    {
        private readonly string _uploadFolderPath;
        private readonly IWebHostEnvironment _hostingEnvironment;

        public ImageController(IWebHostEnvironment hostingEnvironment)
        {
            _hostingEnvironment = hostingEnvironment;

            _uploadFolderPath = Path.Combine(_hostingEnvironment.WebRootPath, "Uploads");
            // Create the upload folder if it doesn't exist
            if (!Directory.Exists(_uploadFolderPath))
            {
                Directory.CreateDirectory(_uploadFolderPath);
            }
        }

        private static string GetUniqueFileName(string fileName)
        {
            fileName = Path.GetFileName(fileName);
            return string.Concat(Guid.NewGuid().ToString(), Path.GetExtension(fileName));
        }

        [HttpPost("image-uploads")]
        public async Task<IActionResult> ImageUploads([FromForm] PostingImages request)
        {
            if (request.Images == null || request.Images.Count == 0)
            {
                return BadRequest("No file received.");
            }

            List<string>? uploadedImageFileNames = new();

            foreach (var image in request.Images)
            {
                if (image.Length > 0)
                {
                    var fileName = GetUniqueFileName(image.FileName);
                    var filePath = Path.Combine(_uploadFolderPath, fileName);
                    using var stream = new FileStream(filePath, FileMode.Create);
                    await image.CopyToAsync(stream);
                    uploadedImageFileNames.Add(fileName);
                }
            }

            return Ok(uploadedImageFileNames);
        }

        [HttpGet("Uploads/{fileName}")]
        public IActionResult GetImageUpload(string fileName)
        {
            try
            {
                var filePath = Path.Combine(_uploadFolderPath, fileName);

                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound("Image not found");
                }

                var fileStream = System.IO.File.OpenRead(filePath);
                return PhysicalFile(filePath, "image/jpg");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex}");
            }
        }

        [HttpGet("Images/{folder}/{fileName}")]
        public IActionResult GetImageConversation(string folder, string fileName)
        {
            try
            {
                var filePath = Path.Combine(_hostingEnvironment.WebRootPath, $"Images/{folder}/{fileName}");

                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound("Image not found");
                }

                var fileStream = System.IO.File.OpenRead(filePath);
                return PhysicalFile(filePath, "image/jpg");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex}");
            }
        }

        public class PostingImages
        {
            public required List<IFormFile> Images { get; set; }
        }

    }
}
